import { OpenAI } from 'openai';

// Analysis result interface for individual analyst reports
interface AnalysisResult {
  positivePoints: string;
  concerns: string;
  averageTargetPrice: string;
  reportTitle: string;
}

// Comprehensive analysis result interface
interface ComprehensiveAnalysisResult {
  summary: string;
  consolidatedPositivePoints: string;
  consolidatedConcerns: string;
  averageTargetPrice: string;
  reportTitles: string[];
  analysisDate: string;
}

export class AIAnalysisService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async comprehensiveAnalysis(analysisResults: (AnalysisResult & { reportTitle: string })[]): Promise<ComprehensiveAnalysisResult> {
    try {
      console.log(`종합 분석 시작: ${analysisResults.length}개 리포트 분석`);
      
      // Extract target prices and calculate average
      const targetPrices: number[] = [];
      analysisResults.forEach(result => {
        if (result.averageTargetPrice) {
          // Extract all digits and commas, then convert to number
          const priceStr = result.averageTargetPrice.replace(/[^\d,]/g, '');
          const price = parseInt(priceStr.replace(/,/g, ''));
          if (!isNaN(price) && price > 0) {
            targetPrices.push(price);
          }
        }
      });

      let averageTargetPrice = "목표주가 정보 없음";
      if (targetPrices.length > 0) {
        const average = Math.round(targetPrices.reduce((sum, price) => sum + price, 0) / targetPrices.length);
        averageTargetPrice = `${average.toLocaleString()}원 (${targetPrices.length}개 리포트 평균)`;
      }

      // Prepare data for AI analysis
      const reportData = analysisResults.map((result, index) => `
리포트 ${index + 1}: ${result.reportTitle || '제목 없음'}
긍정적 요인: ${result.positivePoints || '없음'}
우려사항: ${result.concerns || '없음'}
목표주가: ${result.averageTargetPrice || '설정되지 않음'}
      `).join('\n');

      const prompt = `다음은 ${analysisResults.length}개 애널리스트 리포트의 분석 데이터입니다.

${reportData}

이 리포트들을 종합하여 다음 4개 섹션으로 구성된 비즈니스 분석 보고서를 작성해주세요:

1. 전체 요약 (2-3문장으로 핵심 메시지)
2. 통합된 긍정적 요인들 (불렛 포인트 형식)
3. 통합된 우려사항들 (불렛 포인트 형식)

각 섹션은 간결하고 비즈니스 보고서 스타일로 작성해주세요. 중복되는 내용은 통합하고, 핵심적인 포인트만 포함해주세요.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "당신은 금융 애널리스트입니다. 전문적이고 간결한 비즈니스 보고서를 작성해주세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const aiResponse = completion.choices[0]?.message?.content || "";
      
      // Parse AI response into sections
      const lines = aiResponse.split('\n').filter(line => line.trim());
      
      let summary = "";
      let consolidatedPositivePoints = "";
      let consolidatedConcerns = "";
      
      let currentSection = "";
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.includes('요약') || trimmedLine.includes('종합') || trimmedLine.match(/^1\./)) {
          currentSection = "summary";
          if (!trimmedLine.match(/^1\./)) continue;
        } else if (trimmedLine.includes('긍정') || trimmedLine.match(/^2\./)) {
          currentSection = "positive";
          if (!trimmedLine.match(/^2\./)) continue;
        } else if (trimmedLine.includes('우려') || trimmedLine.includes('리스크') || trimmedLine.match(/^3\./)) {
          currentSection = "concerns";
          if (!trimmedLine.match(/^3\./)) continue;
        }
        
        if (currentSection === "summary") {
          summary += (summary ? " " : "") + trimmedLine.replace(/^1\.\s*/, "");
        } else if (currentSection === "positive") {
          consolidatedPositivePoints += (consolidatedPositivePoints ? "\n" : "") + trimmedLine.replace(/^2\.\s*/, "");
        } else if (currentSection === "concerns") {
          consolidatedConcerns += (consolidatedConcerns ? "\n" : "") + trimmedLine.replace(/^3\.\s*/, "");
        }
      }

      // Clean up sections
      summary = summary.trim();
      consolidatedPositivePoints = consolidatedPositivePoints.trim();
      consolidatedConcerns = consolidatedConcerns.trim();

      const result: ComprehensiveAnalysisResult = {
        summary: summary || "종합 분석을 완료했습니다.",
        consolidatedPositivePoints: consolidatedPositivePoints || "긍정적 요인이 확인되지 않았습니다.",
        consolidatedConcerns: consolidatedConcerns || "특별한 우려사항이 확인되지 않았습니다.",
        averageTargetPrice,
        reportTitles: analysisResults.map(r => r.reportTitle || '제목 없음'),
        analysisDate: new Date().toLocaleDateString('ko-KR')
      };

      console.log('종합 분석 완료:', result);
      return result;

    } catch (error) {
      console.error('AI 분석 오류:', error);
      throw new Error('AI 분석 중 오류가 발생했습니다: ' + error.message);
    }
  }
}