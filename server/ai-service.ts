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

interface ExpectedQuestionsAnalysis {
  expectedQuestions: string[];
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

**반드시 준수할 작성 스타일 (절대 위반 금지):**

1. 모든 정중어 변환 필수:
   - "되었습니다" → "되었음" 또는 "됨"
   - "했습니다" → "했음" 또는 "함"
   - "입니다" → "임"
   - "이었습니다" → "이었음"
   - "컨퍼런스 콜이었습니다" → "컨퍼런스 콜이었음"
   - "진행되었습니다" → "진행됨"
   - "관심을 보였습니다" → "관심 보였음"

2. 불필요한 어미 삭제:
   - "~에서", "~으로", "~와 함께" 등 최대한 생략
   - "본사에서 대면으로" → "본사 대면"
   - "컨퍼런스 콜로" → "컨퍼런스 콜"

3. 숫자 표현 간소화:
   - "총 2회의" → "총2회"
   - "첫 번째" → "첫"
   - "두 번째" → "두번째"

**정확한 변환 예시:**
원래: "이번 주에는 총 2회의 미팅이 진행되었습니다. 첫 번째 미팅은 미래에셋자산운용의 이원준 투자자와 본사에서 대면으로 진행되었습니다. 두 번째 미팅은 삼성자산운용의 유아란, 윤상아 투자자와 컨퍼런스 콜이었습니다."

변환 후: "금주미팅 총2회 진행됨. 첫미팅은 미래에셋자산운용 이원준 투자자와 본사 대면 진행됨. 두번째 미팅은 삼성자산운용 유아란, 윤상아 투자자와 컨퍼런스 콜이었음."

각 섹션은 위 스타일을 엄격히 적용하여 작성하세요.
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

  async generateExpectedQuestions(pastMeetingsData: WeeklyMeetingData): Promise<ExpectedQuestionsAnalysis> {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    if (pastMeetingsData.meetings.length === 0) {
      return {
        expectedQuestions: [
          "Q. 회사의 전반적인 사업 현황은 어떠한가요?",
          "Q. 올해 실적 전망과 목표는 무엇인가요?",
          "Q. 주요 경쟁사 대비 경쟁력은 어떠한가요?",
          "Q. 신규 사업 계획이나 투자 계획은 있나요?",
          "Q. ESG 경영 방침과 지속가능성 전략은 무엇인가요?"
        ]
      };
    }

    const meetingContext = this.prepareMeetingContextForQuestions(pastMeetingsData);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `당신은 투자자 관계(IR) 전문가입니다. 지난 30일간의 미팅 질문과 우려사항을 분석하여, 향후 투자자 미팅에서 예상되는 공통 질문 15개를 생성해주세요.

**분석 기준:**
1. 지난 30일간 투자자들이 실제로 제기한 질문들과 우려사항들
2. 반복적으로 나온 주제나 관심사들
3. 업계 트렌드와 시장 상황을 반영한 질문들
4. 재무, 사업 전략, 리스크, ESG 등 다양한 카테고리 포함

**질문 생성 가이드라인:**
- 각 질문은 "Q. "로 시작
- 구체적이고 실무적인 질문 생성
- 투자자 관점에서 중요한 정보를 요구하는 질문
- 과거 미팅에서 나온 패턴을 기반으로 한 질문
- 한국 기업 IR 미팅에 적합한 톤과 내용

**출력 형식:**
JSON 형식으로 15개의 예상 질문을 배열로 반환
{"expectedQuestions": ["Q. 질문1", "Q. 질문2", ...]}`
          },
          {
            role: "user",
            content: meetingContext
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        expectedQuestions: result.expectedQuestions || [
          "Q. 분석할 미팅 데이터가 충분하지 않습니다.",
          "Q. 추가 미팅 데이터가 확보되면 더 정확한 예상 질문을 생성할 수 있습니다."
        ]
      };
      
    } catch (error: any) {
      console.error('예상질문 생성 오류:', error);
      
      // Error handling similar to analyzeWeeklyMeetings
      if (error.code === 'invalid_api_key') {
        throw new Error('OpenAI API 키가 유효하지 않습니다.');
      } else if (error.code === 'model_not_found') {
        throw new Error('요청한 AI 모델을 찾을 수 없습니다.');
      } else if (error.code === 'insufficient_quota') {
        throw new Error('OpenAI API 사용 할당량을 초과했습니다.');
      } else if (error.message?.includes('network') || error.code === 'ENOTFOUND') {
        throw new Error('네트워크 연결 오류가 발생했습니다.');
      } else {
        throw new Error(`예상질문 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
      }
    }
  }

  private prepareMeetingContextForQuestions(data: WeeklyMeetingData): string {
    let context = `지난 30일간 투자자 미팅 데이터 분석 (예상질문 생성용):\n\n`;
    context += `총 미팅 수: ${data.meetings.length}개\n\n`;

    // 투자자 정보를 ID로 매핑
    const investorMap = new Map();
    if (data.investors) {
      data.investors.forEach(investor => {
        investorMap.set(investor.id.toString(), investor);
      });
    }

    // 질문 패턴 분석을 위한 미팅별 상세 정보
    data.meetings.forEach((meeting, index) => {
      context += `미팅 ${index + 1}:\n`;
      context += `- 미팅 카테고리: ${meeting.meetingCategory || '미기재'}\n`;
      context += `- 참석 유형: ${meeting.attendeeType === 'investor' ? '투자자' : meeting.attendeeType === 'analyst' ? '애널리스트' : '기타'}\n`;
      
      // 참석자 정보
      if (meeting.investorIds && Array.isArray(meeting.investorIds) && meeting.investorIds.length > 0) {
        const attendeeDetails = meeting.investorIds.map(investorId => {
          const investor = investorMap.get(investorId.toString());
          if (investor) {
            return `${investor.name} (${investor.company || '소속 미기재'})`;
          }
          return `투자자 ID: ${investorId}`;
        }).join(', ');
        context += `- 참석자: ${attendeeDetails}\n`;
      }
      
      // 핵심: 미팅에서 제기된 질문과 우려사항
      if (meeting.description) {
        context += `- 주요 질문/우려사항: ${meeting.description}\n`;
      }
      
      if (meeting.title) {
        context += `- 미팅 주제: ${meeting.title}\n`;
      }
      
      context += '\n';
    });

    // 질문 패턴 분석을 위한 추가 컨텍스트
    context += `\n질문 패턴 분석 요청:\n`;
    context += `- 위 미팅들에서 반복적으로 나온 주제들을 식별\n`;
    context += `- 투자자들이 공통적으로 관심을 보인 분야들 파악\n`;
    context += `- 우려사항이나 리스크 관련 질문들의 패턴 분석\n`;
    context += `- 향후 유사한 질문들이 나올 가능성이 높은 영역들 예측\n\n`;
    
    context += `이 데이터를 바탕으로 향후 투자자 미팅에서 나올 가능성이 높은 15개의 예상 질문을 생성해주세요.`;

    return context;
  }
}

export const aiService = new AIService();