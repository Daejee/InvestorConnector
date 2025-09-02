import OpenAI from "openai";
import { ObjectStorageService } from "./objectStorage";
import pdfParse from "pdf-parse";

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
          
          // Parse PDF text
          const pdfData = await pdfParse(pdfBuffer);
          pdfText = pdfData.text;
          console.log(`PDF 텍스트 추출 완료: ${pdfText.length} 문자`);
          
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
다음은 한국 증권사의 애널리스트 리포트 내용입니다. 이를 분석해서 다음 3가지 항목을 JSON 형태로 정리해주세요:

1. positivePoints: 긍정적 평가 사항들 (한국어로 3-5개 주요 포인트, 각 포인트는 "• " 로 시작)
2. concerns: 우려사항들 (한국어로 3-5개 주요 포인트, 각 포인트는 "• " 로 시작)  
3. averageTargetPrice: 목표주가 (정확한 금액이 있으면 "50,000원" 형태로, 없으면 "목표주가 정보 없음")

리포트 내용:
${pdfText.substring(0, 10000)} // 처음 10000자만 사용

응답은 반드시 다음과 같은 JSON 형태로만 해주세요:
{
  "positivePoints": "• 첫 번째 긍정 포인트\n• 두 번째 긍정 포인트\n• 세 번째 긍정 포인트",
  "concerns": "• 첫 번째 우려사항\n• 두 번째 우려사항\n• 세 번째 우려사항",
  "averageTargetPrice": "50,000원"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o as it's more reliable
        messages: [
          {
            role: "system",
            content: "당신은 한국 증권사 애널리스트 리포트를 분석하는 전문가입니다. 리포트를 분석하여 긍정적 요소, 우려사항, 목표주가를 정확히 추출해주세요."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500,
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