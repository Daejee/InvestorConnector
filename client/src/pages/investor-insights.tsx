import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, TrendingUp, AlertCircle, Users, Loader2, Trash2, Brain, CalendarDays, Download, FileText } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'M월 d일', { locale: ko });
  };

  const downloadAsDoc = (insight: InvestorInsight) => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>투자자 인사이트 보고서</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            background-color: #fff;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #1e40af;
            font-size: 28px;
            margin: 0;
            font-weight: bold;
        }
        
        .header .subtitle {
            color: #64748b;
            font-size: 16px;
            margin-top: 8px;
        }
        
        .meta-info {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            border-left: 5px solid #2563eb;
        }
        
        .meta-info table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .meta-info td {
            padding: 8px 12px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .meta-info .label {
            font-weight: bold;
            color: #475569;
            width: 120px;
        }
        
        .meta-info .value {
            color: #1e293b;
        }
        
        .section {
            margin-bottom: 30px;
            background-color: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .section-header {
            padding: 16px 24px;
            font-weight: bold;
            font-size: 18px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .section-content {
            padding: 24px;
            font-size: 14px;
            line-height: 1.7;
            white-space: pre-wrap;
        }
        
        .meeting-summary { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); }
        .common-interests { background: linear-gradient(135deg, #10b981 0%, #047857 100%); }
        .positive-feedback { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .concerns { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        .follow-up { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
        }
        
        .icon {
            width: 20px;
            height: 20px;
            display: inline-block;
        }
        
        @media print {
            body { font-size: 12px; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 투자자 인사이트 보고서</h1>
        <div class="subtitle">Investor Relations Intelligence Report</div>
    </div>
    
    <div class="meta-info">
        <table>
            <tr>
                <td class="label">📅 분석 기간</td>
                <td class="value">${formatDate(insight.weekStartDate)} ~ ${formatDate(insight.weekEndDate)}</td>
            </tr>
            <tr>
                <td class="label">📈 분석 미팅 수</td>
                <td class="value">${insight.meetingCount}개</td>
            </tr>
            <tr>
                <td class="label">🕒 생성 일시</td>
                <td class="value">${format(new Date(insight.generatedAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <div class="section-header meeting-summary">
            <span class="icon">👥</span>
            미팅 요약
        </div>
        <div class="section-content">
${insight.meetingSummary || '미팅 요약 정보가 없습니다.'}
        </div>
    </div>
    
    <div class="section">
        <div class="section-header common-interests">
            <span class="icon">🎯</span>
            투자가 공통관심사
        </div>
        <div class="section-content">
${insight.commonInterests}
        </div>
    </div>
    
    <div class="section">
        <div class="section-header positive-feedback">
            <span class="icon">👍</span>
            긍정피드백 요약
        </div>
        <div class="section-content">
${insight.positiveFeedback}
        </div>
    </div>
    
    <div class="section">
        <div class="section-header concerns">
            <span class="icon">⚠️</span>
            우려사항/리스크
        </div>
        <div class="section-content">
${insight.concerns}
        </div>
    </div>
    
    <div class="section">
        <div class="section-header follow-up">
            <span class="icon">📋</span>
            향후 Follow-up 권고
        </div>
        <div class="section-content">
${insight.followUpRecommendations}
        </div>
    </div>
    
    <div class="footer">
        <div>🚀 IR CRM 시스템에서 생성됨</div>
        <div style="margin-top: 5px;">Powered by AI Intelligence & Data Analytics</div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `투자자인사이트보고서_${formatDate(insight.weekStartDate)}_${formatDate(insight.weekEndDate)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "다운로드 완료",
      description: "디자인된 투자자 인사이트 보고서가 다운로드되었습니다.",
    });
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadAsDoc(insight)}
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              보고서 다운로드
                            </Button>
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
    </div>
  );
}