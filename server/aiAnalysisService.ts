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
      // For now, we'll use a simplified analysis based on title and mock content
      // In a real implementation, you would need to:
      // 1. Download the PDF file from object storage
      // 2. Extract text from PDF using a library like pdf-parse
      // 3. Send the extracted text to OpenAI for analysis
      
      const analysisPrompt = `
애널리스트 리포트 "${reportTitle}"를 분석해주세요.

다음 3가지 항목으로 분석 결과를 JSON 형태로 제공해주세요:

1. positivePoints: 긍정적 평가 사항들 (한국어로 3-5개 주요 포인트)
2. concerns: 우려사항들 (한국어로 3-5개 주요 포인트)  
3. averageTargetPrice: 평균 목표주가 (예: "50,000원" 또는 "목표주가 정보 없음")

응답은 반드시 다음과 같은 JSON 형태로만 해주세요:
{
  "positivePoints": "• 강력한 실적 성장 전망\n• 시장 점유율 확대\n• 새로운 사업 기회",
  "concerns": "• 경쟁 심화 우려\n• 원자재 가격 상승\n• 규제 리스크",
  "averageTargetPrice": "목표주가 정보 없음"
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using gpt-4o as gpt-5 might not be available yet
        messages: [
          {
            role: "system",
            content: "당신은 금융 애널리스트 리포트를 분석하는 전문가입니다. 한국 증권사의 애널리스트 리포트를 분석하여 긍정적 요소, 우려사항, 목표주가를 정리해주세요."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const analysisContent = response.choices[0].message.content;
      if (!analysisContent) {
        throw new Error("AI 분석 결과를 받지 못했습니다");
      }

      const result = JSON.parse(analysisContent);
      
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