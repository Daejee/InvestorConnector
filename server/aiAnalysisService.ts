import OpenAI from "openai";
import { ObjectStorageService } from "./objectStorage";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AnalysisResult {
  positivePoints: string;
  concerns: string;
  averageTargetPrice: string;
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
          console.log(`PDF 텍스트 전체 내용:`);
          console.log(pdfText);
          console.log(`--- PDF 텍스트 끝 ---`);
          
        } catch (error) {
          console.error("PDF 파일 처리 오류:", error);
          // Fall back to title-based analysis if PDF processing fails
          pdfText = `리포트 제목: ${reportTitle}`;
        }
      } else {
        // If no file path, use title-based analysis
        pdfText = `리포트 제목: ${reportTitle}`;
      }
      
      // Analyze with OpenAI  
      const analysisPrompt = `
다음은 한국 증권사의 애널리스트 리포트 원문입니다. 이 텍스트에서 정확한 정보를 추출해서 분석해주세요.

**1단계: 목표주가 찾기**
다음 키워드들을 찾아서 정확한 목표주가를 추출하세요:
- "목표주가", "적정주가", "Target Price", "TP"
- "상향", "하향", "유지" 
- 원, 천원, 만원 단위의 숫자
- 예: "목표주가 81,000원", "TP 85,000원(상향)" 등

**2단계: 분석 내용 정리**
JSON 형태로 다음 3가지 항목을 정리하세요:

리포트 원문:
${pdfText}

응답 형식 (정확히 이 형태로만):
{
  "positivePoints": "리포트에서 언급된 실제 긍정적 내용 (각 줄은 • 로 시작)",
  "concerns": "리포트에서 언급된 실제 우려사항 (각 줄은 • 로 시작)",  
  "averageTargetPrice": "리포트에 명시된 정확한 목표주가 (예: 81,000원) 또는 목표주가 정보 없음"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using faster mini model for better performance
        messages: [
          {
            role: "system",
            content: "한국 증권사 애널리스트 리포트 분석 전문가. 빠르고 정확한 분석 제공."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 800, // Reduced for faster response
        timeout: 10000, // 10 second timeout
      });

      const analysisContent = response.choices[0].message.content;
      if (!analysisContent) {
        throw new Error("AI 분석 결과를 받지 못했습니다");
      }

      const result = JSON.parse(analysisContent);
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
}