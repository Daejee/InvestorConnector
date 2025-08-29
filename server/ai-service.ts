import OpenAI from "openai";
import type { Meeting, Document } from "@shared/schema";

// Using GPT-4o which is the current latest stable model from OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface WeeklyMeetingData {
  meetings: Meeting[];
  documents: Document[];
  investors?: any[]; // 투자자 정보
}

interface InvestorInsightAnalysis {
  commonInterests: string;
  positiveFeedback: string;
  concerns: string;
  followUpRecommendations: string;
  meetingSummary: string;
}

export class AIService {
  async analyzeWeeklyMeetings(data: WeeklyMeetingData): Promise<InvestorInsightAnalysis> {
    if (data.meetings.length === 0) {
      return {
        commonInterests: "분석할 미팅 데이터가 없습니다.",
        positiveFeedback: "분석할 미팅 데이터가 없습니다.",
        concerns: "분석할 미팅 데이터가 없습니다.",
        followUpRecommendations: "미팅 데이터가 확보되면 분석을 진행할 수 있습니다.",
        meetingSummary: "분석할 미팅이 없습니다."
      };
    }

    const meetingContext = this.prepareMeetingContext(data);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `당신은 투자자 관계(IR) 전문가입니다. 한 주간의 미팅 데이터를 분석하여 다음 5가지 카테고리로 인사이트를 제공해주세요:

1. 미팅 요약: 이번주 투자자 미팅 현황을 요약 (몇 명의 투자자와 미팅했는지, 누구와 미팅했는지 - 이름과 기관명 포함)
2. 투자가 공통관심사: 여러 투자자들이 공통적으로 관심을 보인 주제나 질문들
3. 긍정피드백 요약: 투자자들로부터 받은 긍정적인 피드백과 반응들  
4. 우려사항/리스크: 투자자들이 제기한 우려사항이나 리스크 요소들
5. 향후 Follow-up 권고: 다음 주 또는 향후 IR 활동에 대한 구체적인 권장사항들

각 섹션은 구체적이고 실행 가능한 내용으로 작성하되, 한국어로 응답해주세요. 
JSON 형식으로 응답하세요: {"meetingSummary": "내용", "commonInterests": "내용", "positiveFeedback": "내용", "concerns": "내용", "followUpRecommendations": "내용"}`
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
        followUpRecommendations: result.followUpRecommendations || "분석 결과를 가져올 수 없습니다.",
        meetingSummary: result.meetingSummary || "미팅 요약 정보를 가져올 수 없습니다."
      };
      
    } catch (error: any) {
      console.error('AI 분석 오류:', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        response: error.response?.data,
        type: error.type,
        code: error.code
      });
      
      // More specific error messages based on error type
      if (error.code === 'invalid_api_key') {
        throw new Error('OpenAI API 키가 유효하지 않습니다.');
      } else if (error.code === 'model_not_found') {
        throw new Error('요청한 AI 모델을 찾을 수 없습니다.');
      } else if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API 사용 할당량을 초과했습니다.');
      } else if (error.message?.includes('network') || error.code === 'ENOTFOUND') {
        throw new Error('네트워크 연결 오류가 발생했습니다.');
      } else {
        throw new Error(`AI 분석 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
      }
    }
  }

  private prepareMeetingContext(data: WeeklyMeetingData): string {
    let context = `이번 주 미팅 데이터 분석:\n\n`;
    context += `총 미팅 수: ${data.meetings.length}개\n\n`;

    // 투자자 정보를 ID로 매핑하여 빠른 조회 가능
    const investorMap = new Map();
    if (data.investors) {
      data.investors.forEach(investor => {
        investorMap.set(investor.id.toString(), investor);
      });
    }

    data.meetings.forEach((meeting, index) => {
      context += `미팅 ${index + 1}:\n`;
      context += `- 유형: ${meeting.attendeeType === 'investor' ? '투자자' : meeting.attendeeType === 'analyst' ? '애널리스트' : '기타'}\n`;
      context += `- 상태: ${meeting.status}\n`;
      context += `- 카테고리: ${meeting.meetingCategory || '미기재'}\n`;
      context += `- 위치: ${meeting.location || '미기재'}\n`;
      context += `- 일시: ${meeting.scheduledDate}\n`;
      context += `- 지속 시간: ${meeting.duration}분\n`;
      
      // 참석자 정보 추가 - 실제 투자자 이름과 기관명 포함
      if (meeting.investorIds && Array.isArray(meeting.investorIds) && meeting.investorIds.length > 0) {
        const attendeeDetails = meeting.investorIds.map(investorId => {
          const investor = investorMap.get(investorId.toString());
          if (investor) {
            return `${investor.name} (${investor.company || '소속 미기재'})`;
          }
          return `투자자 ID: ${investorId}`;
        }).join(', ');
        context += `- 참석 투자자: ${attendeeDetails}\n`;
      }
      
      if (meeting.description) {
        context += `- 미팅 내용/질문사항: ${meeting.description}\n`;
      }
      
      if (meeting.title) {
        context += `- 미팅 제목: ${meeting.title}\n`;
      }
      
      context += '\n';
    });

    // 투자자 요약 정보 추가
    if (data.investors && data.investors.length > 0) {
      context += `\n전체 투자자 데이터베이스 정보:\n`;
      data.investors.forEach((investor, index) => {
        if (index < 20) { // 처음 20명만 포함하여 컨텍스트 길이 제한
          context += `- ${investor.name} (${investor.company || '소속 미기재'}, ${investor.location || '지역 미기재'})\n`;
        }
      });
      if (data.investors.length > 20) {
        context += `... 및 ${data.investors.length - 20}명 추가\n`;
      }
    }

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

    context += `\n미팅 요약 생성 시 실제 투자자 이름과 소속 기관을 정확히 포함해주세요.`;

    return context;
  }
}

export const aiService = new AIService();