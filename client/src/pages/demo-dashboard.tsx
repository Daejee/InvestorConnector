import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, Calendar, BarChart3 } from "lucide-react";

export default function DemoDashboard() {
  // 데모 접근 확인
  useEffect(() => {
    const demoAuth = localStorage.getItem('demo_authenticated');
    if (!demoAuth) {
      window.location.href = '/login/demo';
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('demo_authenticated');
    window.location.href = '/login/demo';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">데모 회사</h1>
              <p className="text-gray-600">IR CRM 시스템</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            로그아웃
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">투자자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">김철수</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">해외 투자자</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">등록된 해외 투자자 없음</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">예정된 미팅</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">예정된 미팅 없음</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">애널리스트</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">등록된 애널리스트 없음</p>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card>
          <CardHeader>
            <CardTitle>데모 회사 IR CRM에 오신 것을 환영합니다!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              이것은 데모 환경입니다. 실제 데이터와 기능들을 탐색해보세요.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button className="h-auto p-4 flex flex-col items-start" variant="outline">
                <Users className="w-5 h-5 mb-2" />
                <span className="font-medium">투자자 관리</span>
                <span className="text-sm text-muted-foreground">Buyside 투자자 정보 관리</span>
              </Button>
              <Button className="h-auto p-4 flex flex-col items-start" variant="outline">
                <BarChart3 className="w-5 h-5 mb-2" />
                <span className="font-medium">애널리스트 관리</span>
                <span className="text-sm text-muted-foreground">Sellside 애널리스트 정보</span>
              </Button>
              <Button className="h-auto p-4 flex flex-col items-start" variant="outline">
                <Calendar className="w-5 h-5 mb-2" />
                <span className="font-medium">미팅 관리</span>
                <span className="text-sm text-muted-foreground">IR 미팅 일정 관리</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}