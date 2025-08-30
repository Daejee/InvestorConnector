import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, TrendingUp, AlertCircle, Users, Loader2, Trash2, Brain, CalendarDays, Download, FileText, HelpCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvestorInsight {
  id: number;
  organizationId: number;
  weekStartDate: string;
  weekEndDate: string;
  commonInterests: string;
  positiveFeedback: string;
  concerns: string;
  followUpRecommendations: string;
  meetingCount: number;
  meetingSummary?: string;
  generatedAt: string;
  status: 'generating' | 'completed' | 'failed';
}

export default function InvestorInsights() {
  const queryClient = useQueryClient();
  const [selectedInsight, setSelectedInsight] = useState<InvestorInsight | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [expectedQuestions, setExpectedQuestions] = useState<string[]>([]);
  const [isExportingQuestions, setIsExportingQuestions] = useState(false);

  const { data: insights = [], isLoading } = useQuery<InvestorInsight[]>({
    queryKey: ['/api/investor-insights'],
    queryFn: async () => {
      const response = await fetch('/api/investor-insights');
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      return response.json();
    }
  });

  const generateInsightMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      return apiRequest('/api/investor-insights/generate', { method: 'POST', body: { startDate, endDate } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investor-insights'] });
      toast({
        title: "AI 분석 완료",
        description: "주간 투자자 인사이트가 성공적으로 생성되었습니다.",
      });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error('AI 분석 오류:', error);
      toast({
        title: "AI 분석 실패",
        description: error.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  });

  const deleteInsightMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/investor-insights/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investor-insights'] });
      toast({
        title: "인사이트 삭제됨",
        description: "선택한 인사이트가 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: "인사이트 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const generateWeeklyInsight = (weeksAgo = 0) => {
    setIsGenerating(true);
    const today = new Date();
    const targetWeek = subWeeks(today, weeksAgo);
    const weekStartDate = format(startOfWeek(targetWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEndDate = format(endOfWeek(targetWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    generateInsightMutation.mutate({ startDate: weekStartDate, endDate: weekEndDate });
  };

  const generateCustomPeriodInsight = () => {
    if (!startDate || !endDate) {
      toast({
        title: "기간 선택 오류",
        description: "시작일과 종료일을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "기간 선택 오류", 
        description: "시작일이 종료일보다 늦을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    generateInsightMutation.mutate({ startDate, endDate });
  };

  const generateExpectedQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const response = await fetch('/api/investor-insights/expected-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.expectedQuestions && Array.isArray(data.expectedQuestions)) {
        setExpectedQuestions(data.expectedQuestions);
        toast({
          title: "예상질문 생성 완료",
          description: `${data.expectedQuestions.length}개의 예상 질문이 생성되었습니다.`,
        });
      } else {
        console.error('Invalid response structure:', data);
        toast({
          title: "예상질문 생성 실패",
          description: "올바른 형식의 예상질문을 받지 못했습니다.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('예상질문 생성 오류:', error);
      toast({
        title: "예상질문 생성 실패",
        description: error.message || "예상질문 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const exportExpectedQuestionsReport = async (format: 'pdf' | 'doc') => {
    if (expectedQuestions.length === 0) {
      toast({
        title: "내보내기 오류",
        description: "내보낼 예상질문이 없습니다. 먼저 예상질문을 생성해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsExportingQuestions(true);
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const reportData = {
        expectedQuestions,
        reportMeta: {
          period: `${format(thirtyDaysAgo, 'yyyy-MM-dd', { locale: ko })} ~ ${format(today, 'yyyy-MM-dd', { locale: ko })}`,
          questionCount: expectedQuestions.length,
          generatedAt: new Date().toISOString()
        }
      };

      if (format === 'doc') {
        await exportExpectedQuestionsAsDoc(reportData);
      } else {
        await exportExpectedQuestionsAsPDF(reportData);
      }
    } catch (error: any) {
      console.error('예상질문 보고서 내보내기 오류:', error);
      toast({
        title: "내보내기 실패",
        description: "보고서 내보내기 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsExportingQuestions(false);
    }
  };

  const exportExpectedQuestionsAsDoc = async (data: any) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>예상질문 보고서</title>
    <style>
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
            color: #1a1a1a;
            background: #ffffff;
            margin: 0;
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 35px;
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
        }
        .header h1 {
            color: #1e40af;
            font-size: 26px;
            margin: 0 0 8px 0;
            font-weight: 700;
        }
        .header p {
            color: #64748b;
            font-size: 14px;
            margin: 0;
            font-weight: 500;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 35px;
            border: 1px solid #d1d5db;
        }
        .meta-table td {
            padding: 12px 16px;
            border: 1px solid #d1d5db;
        }
        .meta-table .label {
            font-weight: 600;
            color: #374151;
            width: 25%;
            background: #f8fafc;
        }
        .meta-table .value {
            color: #1f2937;
        }
        .section-header {
            padding: 14px 16px;
            border: 1px solid #d1d5db;
            background: #1e40af;
            color: white;
            font-weight: 700;
            font-size: 15px;
            margin: 0;
        }
        .questions-list {
            padding: 18px 16px;
            border: 1px solid #d1d5db;
            line-height: 1.6;
            font-size: 13px;
        }
        .question-item {
            margin-bottom: 12px;
            padding-left: 20px;
            position: relative;
        }
        .question-item:before {
            content: "Q.";
            position: absolute;
            left: 0;
            font-weight: 600;
            color: #2563eb;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>예상질문 보고서</h1>
        <p>Expected Questions Intelligence Report</p>
    </div>
    
    <table class="meta-table">
        <tr>
            <td class="label">분석 기간</td>
            <td class="value">${data.reportMeta.period}</td>
        </tr>
        <tr>
            <td class="label">예상질문 수</td>
            <td class="value">${data.reportMeta.questionCount}개</td>
        </tr>
        <tr>
            <td class="label">생성 일시</td>
            <td class="value">${format(new Date(data.reportMeta.generatedAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</td>
        </tr>
    </table>
    
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
        <tr>
            <td class="section-header">AI 분석 기반 예상질문 목록</td>
        </tr>
        <tr>
            <td class="questions-list">
                ${data.expectedQuestions.map((question: string, index: number) => 
                  `<div class="question-item">${question.replace(/^Q\.\s*/, '')}</div>`
                ).join('')}
            </td>
        </tr>
    </table>
    
    <div class="footer">
        <p>IR CRM 시스템에서 생성됨 | Powered by AI Intelligence & Data Analytics</p>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `예상질문보고서_${format(new Date(), 'yyyyMMdd_HHmm', { locale: ko })}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "DOC 다운로드 완료",
      description: "예상질문 보고서 DOC 파일이 다운로드되었습니다.",
    });
  };

  const exportExpectedQuestionsAsPDF = async (data: any) => {
    // 임시 DOM 요소 생성
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-10000px';
    tempDiv.style.top = '-10000px';
    tempDiv.style.width = '800px';
    tempDiv.style.background = 'white';
    tempDiv.style.fontFamily = 'Malgun Gothic, 맑은 고딕, sans-serif';
    
    tempDiv.innerHTML = `
      <div style="padding: 30px; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1a1a1a; background: #ffffff;">
        <!-- 헤더 -->
        <div style="text-align: center; margin-bottom: 35px; padding-bottom: 20px; border-bottom: 2px solid #2563eb;">
          <h1 style="color: #1e40af; font-size: 26px; margin: 0 0 8px 0; font-weight: 700;">예상질문 보고서</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0; font-weight: 500;">Expected Questions Intelligence Report</p>
        </div>
        
        <!-- 요약 정보 테이블 -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; border: 1px solid #d1d5db;">
          <tr style="background: #f8fafc;">
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151; width: 25%;">분석 기간</td>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937;">${data.reportMeta.period}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151; background: #f8fafc;">예상질문 수</td>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937;">${data.reportMeta.questionCount}개</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">생성 일시</td>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937;">${format(new Date(data.reportMeta.generatedAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</td>
          </tr>
        </table>
        
        <!-- 예상질문 목록 -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
          <tr>
            <td style="padding: 14px 16px; border: 1px solid #d1d5db; background: #1e40af; color: white; font-weight: 700; font-size: 15px;">AI 분석 기반 예상질문 목록</td>
          </tr>
          <tr>
            <td style="padding: 18px 16px; border: 1px solid #d1d5db; line-height: 1.8; font-size: 13px;">
              ${data.expectedQuestions.map((question: string, index: number) => 
                `<div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                   <span style="position: absolute; left: 0; font-weight: 600; color: #2563eb;">Q.</span>
                   ${question.replace(/^Q\.\s*/, '')}
                 </div>`
              ).join('')}
            </td>
          </tr>
        </table>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280;">
          <p>IR CRM 시스템에서 생성됨 | Powered by AI Intelligence & Data Analytics</p>
        </div>
      </div>
    `;

    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`예상질문보고서_${format(new Date(), 'yyyyMMdd_HHmm', { locale: ko })}.pdf`);
      
      toast({
        title: "PDF 다운로드 완료",
        description: "예상질문 보고서 PDF 파일이 다운로드되었습니다.",
      });
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'M월 d일', { locale: ko });
  };

  const downloadAsDOC = (insight: InvestorInsight) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>투자자 인사이트 보고서</title>
    <style>
        body {
            padding: 30px;
            font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
            color: #1a1a1a;
            background: #ffffff;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 35px;
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
        }
        .header h1 {
            color: #1e40af;
            font-size: 26px;
            margin: 0 0 8px 0;
            font-weight: 700;
        }
        .header p {
            color: #64748b;
            font-size: 14px;
            margin: 0;
            font-weight: 500;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d1d5db;
            margin-bottom: 35px;
        }
        .info-table {
            margin-bottom: 35px;
        }
        .content-table {
            margin-bottom: 0;
        }
        td {
            padding: 12px 16px;
            border: 1px solid #d1d5db;
        }
        .info-row {
            background: #f8fafc;
        }
        .info-label {
            font-weight: 600;
            color: #374151;
            width: 25%;
        }
        .info-value {
            color: #1f2937;
        }
        .section-header {
            padding: 14px 16px;
            background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
            color: white;
            font-weight: 700;
            font-size: 15px;
        }
        .section-content {
            padding: 18px 16px;
            line-height: 1.6;
            font-size: 13px;
            white-space: pre-line;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 11px;
        }
        .footer p {
            margin: 0;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>투자자 인사이트 보고서</h1>
        <p>Investor Relations Intelligence Report</p>
    </div>
    
    <table class="info-table">
        <tr class="info-row">
            <td class="info-label">분석 기간</td>
            <td class="info-value">${formatDate(insight.weekStartDate)} ~ ${formatDate(insight.weekEndDate)}</td>
        </tr>
        <tr>
            <td class="info-label" style="background: #f8fafc;">분석 미팅 수</td>
            <td class="info-value">${insight.meetingCount}개</td>
        </tr>
        <tr class="info-row">
            <td class="info-label">생성 일시</td>
            <td class="info-value">${format(new Date(insight.generatedAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</td>
        </tr>
    </table>
    
    <table class="content-table">
        <tr>
            <td class="section-header" style="background: #1e40af;">1. 미팅 요약</td>
        </tr>
        <tr>
            <td class="section-content">
${insight.meetingSummary ? insight.meetingSummary.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '미팅 요약 정보가 없습니다.'}
            </td>
        </tr>
        
        <tr>
            <td class="section-header" style="background: #2563eb;">2. 투자가 공통관심사</td>
        </tr>
        <tr>
            <td class="section-content">
${insight.commonInterests ? insight.commonInterests.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '공통관심사 정보가 없습니다.'}
            </td>
        </tr>
        
        <tr>
            <td class="section-header" style="background: #3b82f6;">3. 긍정피드백 요약</td>
        </tr>
        <tr>
            <td class="section-content">
${insight.positiveFeedback ? insight.positiveFeedback.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '긍정피드백 정보가 없습니다.'}
            </td>
        </tr>
        
        <tr>
            <td class="section-header" style="background: #60a5fa;">4. 우려사항/리스크</td>
        </tr>
        <tr>
            <td class="section-content">
${insight.concerns ? insight.concerns.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '우려사항 정보가 없습니다.'}
            </td>
        </tr>
        
        <tr>
            <td class="section-header" style="background: #93c5fd;">5. 향후 Follow-up 권고</td>
        </tr>
        <tr>
            <td class="section-content">
${insight.followUpRecommendations ? insight.followUpRecommendations.replace(/\. /g, '.\n• ').replace(/^/, '• ') : 'Follow-up 권고사항이 없습니다.'}
            </td>
        </tr>
    </table>
    
    <div class="footer">
        <p>IR CRM 시스템에서 생성됨 | Powered by AI Intelligence & Data Analytics</p>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `투자자인사이트보고서_${formatDate(insight.weekStartDate)}_${formatDate(insight.weekEndDate)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "DOC 다운로드 완료",
      description: "투자자 인사이트 보고서 DOC 파일이 다운로드되었습니다.",
    });
  };

  const downloadAsPDF = async (insight: InvestorInsight) => {
    // 임시 DOM 요소 생성
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-10000px';
    tempDiv.style.top = '-10000px';
    tempDiv.style.width = '800px';
    tempDiv.style.background = 'white';
    tempDiv.style.fontFamily = 'Malgun Gothic, 맑은 고딕, sans-serif';
    
    tempDiv.innerHTML = `
      <div style="padding: 30px; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; color: #1a1a1a; background: #ffffff;">
        <!-- 헤더 -->
        <div style="text-align: center; margin-bottom: 35px; padding-bottom: 20px; border-bottom: 2px solid #2563eb;">
          <h1 style="color: #1e40af; font-size: 26px; margin: 0 0 8px 0; font-weight: 700;">투자자 인사이트 보고서</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0; font-weight: 500;">Investor Relations Intelligence Report</p>
        </div>
        
        <!-- 요약 정보 테이블 -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; border: 1px solid #d1d5db;">
          <tr style="background: #f8fafc;">
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151; width: 25%;">분석 기간</td>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937;">${formatDate(insight.weekStartDate)} ~ ${formatDate(insight.weekEndDate)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151; background: #f8fafc;">분석 미팅 수</td>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937;">${insight.meetingCount}개</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">생성 일시</td>
            <td style="padding: 12px 16px; border: 1px solid #d1d5db; color: #1f2937;">${format(new Date(insight.generatedAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</td>
          </tr>
        </table>
        
        <!-- 분석 내용 테이블 -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db;">
          <tr>
            <td style="padding: 14px 16px; border: 1px solid #d1d5db; background: #1e40af; color: white; font-weight: 700; font-size: 15px;">1. 미팅 요약</td>
          </tr>
          <tr>
            <td style="padding: 18px 16px; border: 1px solid #d1d5db; line-height: 1.6; font-size: 13px;">
              ${insight.meetingSummary ? insight.meetingSummary.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '미팅 요약 정보가 없습니다.'}
            </td>
          </tr>
          
          <tr>
            <td style="padding: 14px 16px; border: 1px solid #d1d5db; background: #2563eb; color: white; font-weight: 700; font-size: 15px;">2. 투자가 공통관심사</td>
          </tr>
          <tr>
            <td style="padding: 18px 16px; border: 1px solid #d1d5db; line-height: 1.6; font-size: 13px;">
              ${insight.commonInterests ? insight.commonInterests.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '공통관심사 정보가 없습니다.'}
            </td>
          </tr>
          
          <tr>
            <td style="padding: 14px 16px; border: 1px solid #d1d5db; background: #3b82f6; color: white; font-weight: 700; font-size: 15px;">3. 긍정피드백 요약</td>
          </tr>
          <tr>
            <td style="padding: 18px 16px; border: 1px solid #d1d5db; line-height: 1.6; font-size: 13px;">
              ${insight.positiveFeedback ? insight.positiveFeedback.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '긍정피드백 정보가 없습니다.'}
            </td>
          </tr>
          
          <tr>
            <td style="padding: 14px 16px; border: 1px solid #d1d5db; background: #60a5fa; color: white; font-weight: 700; font-size: 15px;">4. 우려사항/리스크</td>
          </tr>
          <tr>
            <td style="padding: 18px 16px; border: 1px solid #d1d5db; line-height: 1.6; font-size: 13px;">
              ${insight.concerns ? insight.concerns.replace(/\. /g, '.\n• ').replace(/^/, '• ') : '우려사항 정보가 없습니다.'}
            </td>
          </tr>
          
          <tr>
            <td style="padding: 14px 16px; border: 1px solid #d1d5db; background: #93c5fd; color: white; font-weight: 700; font-size: 15px;">5. 향후 Follow-up 권고</td>
          </tr>
          <tr>
            <td style="padding: 18px 16px; border: 1px solid #d1d5db; line-height: 1.6; font-size: 13px;">
              ${insight.followUpRecommendations ? insight.followUpRecommendations.replace(/\. /g, '.\n• ').replace(/^/, '• ') : 'Follow-up 권고사항이 없습니다.'}
            </td>
          </tr>
        </table>
        
        <!-- 푸터 -->
        <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 11px;">
          <p style="margin: 0; font-weight: 500;">IR CRM 시스템에서 생성됨 | Powered by AI Intelligence & Data Analytics</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempDiv);

    try {
      // Canvas로 변환
      const canvas = await html2canvas(tempDiv, {
        width: 800,
        height: tempDiv.scrollHeight,
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // PDF 생성
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // 첫 페이지 추가
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 여러 페이지가 필요한 경우 페이지 추가
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // PDF 다운로드
      pdf.save(`투자자인사이트보고서_${formatDate(insight.weekStartDate)}_${formatDate(insight.weekEndDate)}.pdf`);
      
      toast({
        title: "PDF 다운로드 완료",
        description: "투자자 인사이트 보고서 PDF가 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      toast({
        title: "PDF 생성 실패",
        description: "PDF 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      // 임시 요소 제거
      document.body.removeChild(tempDiv);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">완료</Badge>;
      case 'generating':
        return <Badge className="bg-blue-100 text-blue-800">생성중</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">실패</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">인사이트를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Investor Insight</h1>
          <p className="text-muted-foreground">
            AI가 분석한 주간 미팅 보고서로 투자자 인사이트를 확인하세요
          </p>
        </div>
        
        <div className="flex items-end gap-6">
          <Button 
            onClick={() => generateWeeklyInsight(0)}
            disabled={isGenerating}
            variant="outline"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            이번주 분석
          </Button>
          
          <div className="flex items-end gap-3">
            <div className="flex gap-3">
              <div>
                <Label htmlFor="start-date" className="text-sm text-muted-foreground">시작일</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm text-muted-foreground">종료일</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            <Button 
              onClick={generateCustomPeriodInsight}
              disabled={isGenerating}
              variant="default"
              className="whitespace-nowrap"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
              기간 분석
            </Button>
          </div>
        </div>
      </div>


      {insights.length === 0 ? (
        <Card className="text-center p-12">
          <CardContent>
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">아직 생성된 인사이트가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              AI 분석을 시작하여 투자자 미팅에서 얻은 인사이트를 확인해보세요.
            </p>
            <Button onClick={() => generateWeeklyInsight(0)}>
              <Brain className="h-4 w-4 mr-2" />
              첫 번째 인사이트 생성
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {insights.map((insight) => (
            <Card key={insight.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatDate(insight.weekStartDate)} - {formatDate(insight.weekEndDate)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Users className="h-4 w-4" />
                      미팅 {insight.meetingCount}개 분석
                      <span className="ml-2">
                        {getStatusBadge(insight.status)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          자세히 보기
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <DialogTitle>
                                주간 투자자 인사이트 - {formatDate(insight.weekStartDate)} ~ {formatDate(insight.weekEndDate)}
                              </DialogTitle>
                              <DialogDescription>
                                미팅 {insight.meetingCount}개 분석 결과
                              </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadAsPDF(insight)}
                                className="flex items-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                PDF 다운로드
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadAsDOC(insight)}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                DOC 다운로드
                              </Button>
                            </div>
                          </div>
                        </DialogHeader>
                        <div className="space-y-6">
                          {insight.meetingSummary && (
                            <div>
                              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-600" />
                                미팅 요약
                              </h3>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="whitespace-pre-wrap">{insight.meetingSummary}</p>
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <Users className="h-5 w-5 text-blue-600" />
                              투자가 공통관심사
                            </h3>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="whitespace-pre-wrap">{insight.commonInterests}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-green-600" />
                              긍정피드백 요약
                            </h3>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="whitespace-pre-wrap">{insight.positiveFeedback}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-orange-600" />
                              우려사항/리스크
                            </h3>
                            <div className="bg-orange-50 p-4 rounded-lg">
                              <p className="whitespace-pre-wrap">{insight.concerns}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-purple-600" />
                              향후 Follow-up 권고
                            </h3>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <p className="whitespace-pre-wrap">{insight.followUpRecommendations}</p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteInsightMutation.mutate(insight.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      <strong>공통관심사</strong>
                      <p className="text-sm mt-1 line-clamp-3">{insight.commonInterests}</p>
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="border-green-200 bg-green-50">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong className="text-green-800">긍정피드백</strong>
                      <p className="text-sm mt-1 line-clamp-3 text-green-700">{insight.positiveFeedback}</p>
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription>
                      <strong className="text-orange-800">우려사항</strong>
                      <p className="text-sm mt-1 line-clamp-3 text-orange-700">{insight.concerns}</p>
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="border-purple-200 bg-purple-50">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <AlertDescription>
                      <strong className="text-purple-800">Follow-up</strong>
                      <p className="text-sm mt-1 line-clamp-3 text-purple-700">{insight.followUpRecommendations}</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Expected Questions Section - 맨 아래로 이동 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            예상질문 (Expected Questions)
          </CardTitle>
          <CardDescription>
            지난 30일간의 미팅 질문과 우려사항을 AI가 분석하여 향후 예상되는 질문 15개를 생성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateExpectedQuestions}
            disabled={isGeneratingQuestions}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isGeneratingQuestions ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <HelpCircle className="h-4 w-4 mr-2" />
            )}
            {isGeneratingQuestions ? '예상질문 생성 중...' : '예상질문 생성'}
          </Button>
          
          {expectedQuestions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-muted-foreground">
                  AI 생성 예상질문 ({expectedQuestions.length}개)
                </h4>
                <div className="flex gap-2">
                  <Button
                    onClick={() => exportExpectedQuestionsReport('pdf')}
                    disabled={isExportingQuestions}
                    size="sm"
                    variant="outline"
                  >
                    {isExportingQuestions ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <FileText className="h-4 w-4 mr-1" />
                    )}
                    PDF
                  </Button>
                  <Button
                    onClick={() => exportExpectedQuestionsReport('doc')}
                    disabled={isExportingQuestions}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    DOC
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                {expectedQuestions.map((question, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg border-l-4 border-blue-500"
                  >
                    <p className="text-sm">{question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}