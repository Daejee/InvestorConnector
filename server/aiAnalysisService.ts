import OpenAI from "openai";
import { ObjectStorageService } from "./objectStorage";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AnalysisResult {
  positivePoints: string;
  concerns: string;
  averageTargetPrice: string;
}

export interface ComprehensiveAnalysisResult {
  summary: string;
  consolidatedPositivePoints: string;
  consolidatedConcerns: string;
  averageTargetPrice: string;
  reportTitles: string[];
  analysisDate: string;
}

export class AIAnalysisService {
  private objectStorageService: ObjectStorageService;

  constructor() {
    this.objectStorageService = new ObjectStorageService();
  }

  async analyzeReport(filePath: string, reportTitle: string): Promise<AnalysisResult> {
    try {
      console.log(`AI 분석 시작: ${reportTitle} (${filePath})`);
      
      let pdfText = "";
      
      // Extract text from PDF file
      if (filePath && filePath.startsWith("/objects/")) {
        try {
          // Get the PDF file from object storage
          const objectFile = await this.objectStorageService.getObjectEntityFile(filePath);
          
          // Download the file content
          const stream = objectFile.createReadStream();
          const chunks: Buffer[] = [];
          
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          
          const pdfBuffer = Buffer.concat(chunks);
          console.log(`PDF 파일 다운로드 완료: ${pdfBuffer.length} bytes`);
          
          // Parse PDF text using dynamic import
          const pdfParse = (await import("pdf-parse")).default;
          const pdfData = await pdfParse(pdfBuffer);
          pdfText = pdfData.text;
          console.log(`PDF 텍스트 추출 완료: ${pdfText.length} 문자`);
          console.log("PDF 내용 미리보기:", pdfText.substring(0, 500) + "...");
          
          // Check if PDF content is meaningful
          if (!pdfText || pdfText.trim().length < 50) {
            throw new Error("PDF 파일에서 충분한 텍스트 내용을 추출할 수 없습니다.");
          }
          
          // Use actual PDF content for real analysis
          console.log("실제 PDF 내용 사용");
          
        } catch (error) {
          console.error("PDF 파일 처리 오류:", error);
          // Return error instead of making up content
          throw new Error("PDF 파일을 읽을 수 없어 분석이 불가능합니다. 파일을 다시 업로드해주세요.");
        }
      } else {
        // If no file path, cannot provide meaningful analysis
        throw new Error("분석할 PDF 파일이 없습니다. 리포트 파일을 업로드해주세요.");
      }
      
      // Analyze with OpenAI  
      const analysisPrompt = `
다음은 한국 증권사의 애널리스트 리포트 원문입니다. 이 텍스트에서 **오직 실제로 명시된 내용만** 추출해주세요.

**중요한 지침:**
1. 리포트에 실제로 쓰여있는 내용만 사용하세요
2. 일반적인 시장 상황이나 가정으로 내용을 만들어내지 마세요
3. "글로벌 경제 불확실성", "원자재 가격" 같은 일반론적 표현은 리포트에 명시되지 않았다면 사용하지 마세요

**목표주가 추출:**
다음 패턴들을 리포트에서 찾으세요:
- "목표주가 XX,XXX원"
- "적정주가 XX,XXX원" 
- "Target Price XX,XXX원"
- "TP XX,XXX원"
리포트에 명시된 정확한 숫자를 그대로 사용하세요.

**긍정적 요소와 우려사항:**
- 리포트에서 실제로 언급된 구체적인 내용만 추출
- 회사명, 제품명, 구체적인 수치가 포함된 실제 내용만 사용
- 일반적인 시장 리스크나 가정은 제외

리포트 원문:
${pdfText}

응답을 JSON 형식으로 제공하세요:
{
  "positivePoints": "리포트에서 실제로 언급된 구체적인 긍정적 내용만 (각 줄은 • 로 시작)",
  "concerns": "리포트에서 실제로 언급된 구체적인 우려사항만 (각 줄은 • 로 시작)",  
  "averageTargetPrice": "리포트에 명시된 정확한 목표주가 또는 목표주가 정보 없음"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using standard gpt-4o for better analysis
        messages: [
          {
            role: "system",
            content: "당신은 한국 증권사 애널리스트 리포트를 정확히 분석하는 전문가입니다. 오직 주어진 리포트 텍스트에 실제로 명시된 내용만 추출하고, 가정이나 일반론을 추가하지 마세요. 응답을 JSON 형식으로 제공하세요."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const analysisContent = response.choices[0].message.content;
      if (!analysisContent) {
        throw new Error("AI 분석 결과를 받지 못했습니다");
      }

      let result;
      try {
        // Try to extract JSON from the response if it's wrapped in text
        const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : analysisContent;
        result = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("JSON 파싱 실패, 기본 구조로 대체:", parseError);
        // Fallback to creating a structured response
        result = {
          positivePoints: "파싱 오류로 인해 긍정 요인을 추출할 수 없습니다.",
          concerns: "파싱 오류로 인해 우려사항을 추출할 수 없습니다.",
          averageTargetPrice: "파싱 오류로 목표주가 추출 실패"
        };
      }
      console.log("AI 분석 완료:", result);
      
      return {
        positivePoints: result.positivePoints || "분석 결과 없음",
        concerns: result.concerns || "분석 결과 없음", 
        averageTargetPrice: result.averageTargetPrice || "목표주가 정보 없음"
      };

    } catch (error) {
      console.error("AI 분석 중 오류 발생:", error);
      throw new Error("AI 분석에 실패했습니다");
    }
  }

  async comprehensiveAnalysis(analysisResults: (AnalysisResult & { reportTitle: string })[]): Promise<ComprehensiveAnalysisResult> {
    try {
      console.log(`종합 분석 시작: ${analysisResults.length}개 리포트 분석`);
      
      // Extract target prices and calculate average
      const targetPrices: number[] = [];
      analysisResults.forEach(result => {
        const priceMatch = result.averageTargetPrice.match(/(\d{1,3}(?:,\d{3})*)/);
        if (priceMatch) {
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          if (!isNaN(price)) {
            targetPrices.push(price);
          }
        }
      });

      let averageTargetPrice = "목표주가 정보 없음";
      if (targetPrices.length > 0) {
        const average = Math.round(targetPrices.reduce((sum, price) => sum + price, 0) / targetPrices.length);
        averageTargetPrice = `${average.toLocaleString()}원 (${targetPrices.length}개 리포트 평균)`;
      }

      // Prepare comprehensive analysis prompt
      const comprehensivePrompt = `
다음은 여러 증권사의 애널리스트 리포트 분석 결과들입니다. 이를 종합하여 통합 분석 보고서를 작성하고, 결과를 JSON 형식으로 제공해주세요.

## 분석 대상 리포트들:
${analysisResults.map((result, index) => `
**리포트 ${index + 1}: ${result.reportTitle}**
- 긍정적 요소: ${result.positivePoints}
- 우려사항: ${result.concerns}
- 목표주가: ${result.averageTargetPrice}
`).join('\n')}

## 요청사항:
1. **종합 요약**: 전체 리포트들의 핵심 내용을 2-3문장으로 요약
2. **통합 긍정요인**: 여러 리포트에서 공통으로 언급된 긍정적 요소들과 각 리포트만의 고유한 강점들을 종합
3. **통합 우려사항**: 여러 리포트에서 공통으로 지적된 리스크와 각 리포트별 고유 우려사항들을 종합
4. **목표주가 분석**: 계산된 평균 목표주가 "${averageTargetPrice}"에 대한 해석

응답을 다음 JSON 형식으로 정확히 제공해주세요:
{
  "summary": "전체 리포트들의 핵심 요약",
  "consolidatedPositivePoints": "통합된 긍정적 요소들 (각 줄은 • 로 시작)",
  "consolidatedConcerns": "통합된 우려사항들 (각 줄은 • 로 시작)",
  "averageTargetPrice": "${averageTargetPrice}"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "당신은 증권사 애널리스트 리포트들을 종합 분석하는 전문가입니다. 여러 리포트의 내용을 객관적으로 통합하여 포괄적인 분석을 제공하고, 모든 응답을 JSON 형식으로 제공해주세요."
          },
          {
            role: "user",
            content: comprehensivePrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const analysisContent = response.choices[0].message.content;
      if (!analysisContent) {
        throw new Error("종합 분석 결과를 받지 못했습니다");
      }

      let result;
      try {
        // Try to extract JSON from the response if it's wrapped in text
        const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : analysisContent;
        result = JSON.parse(jsonString);
      } catch (parseError) {
        console.error("JSON 파싱 실패, 기본 구조로 대체:", parseError);
        // Fallback to creating a structured response
        result = {
          summary: "AI 응답 파싱에 실패하여 원본 내용을 제공합니다.",
          consolidatedPositivePoints: analysisContent.substring(0, 500) + "...",
          consolidatedConcerns: "파싱 오류로 인해 우려사항을 추출할 수 없습니다.",
          averageTargetPrice: "파싱 오류"
        };
      }
      console.log("종합 분석 완료:", result);
      
      return {
        summary: result.summary || "종합 분석 결과 없음",
        consolidatedPositivePoints: result.consolidatedPositivePoints || "긍정 요인 없음",
        consolidatedConcerns: result.consolidatedConcerns || "우려사항 없음",
        averageTargetPrice: averageTargetPrice,
        reportTitles: analysisResults.map(r => r.reportTitle),
        analysisDate: new Date().toISOString().split('T')[0]
      };

    } catch (error) {
      console.error("종합 분석 중 오류 발생:", error);
      throw new Error("종합 분석에 실패했습니다");
    }
  }
}