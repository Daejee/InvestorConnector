import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, AlertCircle, Users, Loader2, Trash2, Brain } from "lucide-react";
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
  generatedAt: string;
  status: 'generating' | 'completed' | 'failed';
}

export default function InvestorInsights() {
  const queryClient = useQueryClient();
  const [selectedInsight, setSelectedInsight] = useState<InvestorInsight | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
    const startDate = format(startOfWeek(targetWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const endDate = format(endOfWeek(targetWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    generateInsightMutation.mutate({ startDate, endDate });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'M월 d일', { locale: ko });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Investor Insight</h1>
          <p className="text-muted-foreground">
            AI가 분석한 주간 미팅 보고서로 투자자 인사이트를 확인하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => generateWeeklyInsight(1)}
            disabled={isGenerating}
            variant="outline"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            지난주 분석
          </Button>
          <Button 
            onClick={() => generateWeeklyInsight(0)}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            이번주 분석
          </Button>
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
                          <DialogTitle>
                            주간 투자자 인사이트 - {formatDate(insight.weekStartDate)} ~ {formatDate(insight.weekEndDate)}
                          </DialogTitle>
                          <DialogDescription>
                            미팅 {insight.meetingCount}개 분석 결과
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
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