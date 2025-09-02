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
      console.log(`=== AI 분석 시작 ===`);
      console.log(`리포트 제목: ${reportTitle}`);
      console.log(`파일 경로: ${filePath}`);
      console.log(`파일 경로 타입: ${typeof filePath}`);
      console.log(`파일 경로 길이: ${filePath?.length}`);
      console.log(`파일 경로 비어있음: ${!filePath || filePath.trim() === ""}`);
      
      let pdfText = "";
      
      // Extract text from PDF file  
      if (filePath && filePath.trim() !== "") {
        console.log("✅ 파일 경로가 존재함, PDF 처리 시작...");
        try {
          // Convert Google Cloud Storage URL to object path if needed
          let objectPath = filePath;
          if (filePath.startsWith("https://storage.googleapis.com/")) {
            // Extract the object path from the full URL
            // Example: https://storage.googleapis.com/replit-objstore-xxx/.private/uploads/file-id
            // Convert to: /objects/uploads/file-id
            const urlParts = filePath.split("/");
            const uploadsIndex = urlParts.findIndex(part => part === "uploads");
            if (uploadsIndex !== -1 && uploadsIndex < urlParts.length - 1) {
              const fileId = urlParts[uploadsIndex + 1];
              objectPath = `/objects/uploads/${fileId}`;
            }
          }
          
          console.log("변환된 객체 경로:", objectPath);
          
          // Get the PDF file from object storage
          const objectFile = await this.objectStorageService.getObjectEntityFile(objectPath);
          
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
          console.log("PDF 내용 전체 출력:");
          console.log("=".repeat(50));
          console.log(pdfText);
          console.log("=".repeat(50));
          
          // Check if PDF content is meaningful
          if (!pdfText || pdfText.trim().length < 50) {
            console.error("PDF 내용이 부족함:", pdfText);
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
        console.log("❌ 파일 경로가 없음 또는 비어있음");
        console.log("파일 경로 값:", JSON.stringify(filePath));
        throw new Error("분석할 PDF 파일이 없습니다. 리포트 파일을 업로드해주세요.");
      }
      
      // For now, return the actual PDF content to verify it's being extracted correctly
      console.log("PDF 파싱 테스트 - 실제 내용 확인 중...");
      
      // Return actual PDF content for debugging
      return {
        positivePoints: `PDF 텍스트 길이: ${pdfText.length}문자\n처음 500자: ${pdfText.substring(0, 500)}`,
        concerns: `PDF 내용에서 '목표주가' 검색 결과: ${pdfText.includes('목표주가') ? '발견됨' : '없음'}`,
        averageTargetPrice: pdfText.includes('목표주가') ? 
          pdfText.match(/목표주가\s*[\d,]+원/)?.[0] || "패턴 매칭 실패" : 
          "목표주가 키워드 없음"
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