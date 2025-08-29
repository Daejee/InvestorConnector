import OpenAI from "openai";
import type { Meeting, Document } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface WeeklyMeetingData {
  meetings: Meeting[];
  documents: Document[];
}

interface InvestorInsightAnalysis {
  commonInterests: string;
  positiveFeedback: string;
  concerns: string;
  followUpRecommendations: string;
}

export class AIService {
  async analyzeWeeklyMeetings(data: WeeklyMeetingData): Promise<InvestorInsightAnalysis> {
    if (data.meetings.length === 0) {
      return {
        commonInterests: "분석할 미팅 데이터가 없습니다.",
        positiveFeedback: "분석할 미팅 데이터가 없습니다.",
        concerns: "분석할 미팅 데이터가 없습니다.",
        followUpRecommendations: "미팅 데이터가 확보되면 분석을 진행할 수 있습니다."
      };
    }

    const meetingContext = this.prepareMeetingContext(data);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `당신은 투자자 관계(IR) 전문가입니다. 한 주간의 미팅 데이터를 분석하여 다음 4가지 카테고리로 인사이트를 제공해주세요:

1. 투자가 공통관심사: 여러 투자자들이 공통적으로 관심을 보인 주제나 질문들
2. 긍정피드백 요약: 투자자들로부터 받은 긍정적인 피드백과 반응들  
3. 우려사항/리스크: 투자자들이 제기한 우려사항이나 리스크 요소들
4. 향후 Follow-up 권고: 다음 주 또는 향후 IR 활동에 대한 구체적인 권장사항들

각 섹션은 구체적이고 실행 가능한 내용으로 작성하되, 한국어로 응답해주세요. 
JSON 형식으로 응답하세요: {"commonInterests": "내용", "positiveFeedback": "내용", "concerns": "내용", "followUpRecommendations": "내용"}`
          },
          {
            role: "user",
            content: meetingContext
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        commonInterests: result.commonInterests || "분석 결과를 가져올 수 없습니다.",
        positiveFeedback: result.positiveFeedback || "분석 결과를 가져올 수 없습니다.",
        concerns: result.concerns || "분석 결과를 가져올 수 없습니다.",
        followUpRecommendations: result.followUpRecommendations || "분석 결과를 가져올 수 없습니다."
      };
      
    } catch (error) {
      console.error('AI 분석 오류:', error);
      throw new Error('AI 분석 중 오류가 발생했습니다.');
    }
  }

  private prepareMeetingContext(data: WeeklyMeetingData): string {
    let context = `이번 주 미팅 데이터 분석:\n\n`;
    context += `총 미팅 수: ${data.meetings.length}개\n\n`;

    data.meetings.forEach((meeting, index) => {
      context += `미팅 ${index + 1}:\n`;
      context += `- 유형: ${meeting.attendeeType === 'investor' ? '투자자' : meeting.attendeeType === 'analyst' ? '애널리스트' : '기타'}\n`;
      context += `- 상태: ${meeting.status}\n`;
      context += `- 위치: ${meeting.location || '미기재'}\n`;
      context += `- 일시: ${meeting.scheduledDate}\n`;
      if (meeting.description) {
        context += `- 설명: ${meeting.description}\n`;
      }
      context += '\n';
    });

    // 관련 문서가 있다면 추가
    if (data.documents.length > 0) {
      context += `\n관련 문서:\n`;
      data.documents.forEach((doc, index) => {
        context += `문서 ${index + 1}: ${doc.name} (${doc.category || '미분류'})\n`;
        if (doc.description) {
          context += `- 설명: ${doc.description}\n`;
        }
      });
    }

    return context;
  }
}

export const aiService = new AIService();