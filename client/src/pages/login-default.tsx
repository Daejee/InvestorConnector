import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Lock, User, ArrowRight } from "lucide-react";

function DefaultLoginForm() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 기본 조직용 인증 로직
      if (email === "admin@default.com" && password === "admin123") {
        // AuthContext에 로그인 상태 설정
        login({
          id: 1,
          email: "admin@default.com",
          name: "관리자",
          organizationId: 1
        });
        
        toast({
          title: "로그인 성공",
          description: "IR CRM 시스템에 오신 것을 환영합니다!",
        });
        
        // 기본 조직 대시보드로 리다이렉트
        setLocation("/org/default");
      } else {
        toast({
          title: "로그인 실패",
          description: "이메일 또는 비밀번호가 올바르지 않습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-8">
          {/* 기본 조직 로고 영역 */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-600 to-slate-700 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-gray-900">
              기본 조직
            </CardTitle>
            <CardDescription className="text-gray-600">
              IR CRM 시스템에 로그인하세요
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  이메일
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@default.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  비밀번호
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                "로그인 중..."
              ) : (
                <>
                  로그인
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* 기본 계정 정보 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">기본 계정 정보</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>이메일:</strong> admin@default.com</p>
              <p><strong>비밀번호:</strong> admin123</p>
            </div>
          </div>

          {/* 푸터 */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>기본 조직 IR CRM 시스템</p>
            <p className="mt-1">© 2025 All rights reserved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DefaultLogin() {
  return (
    <OrganizationProvider>
      <AuthProvider>
        <DefaultLoginForm />
      </AuthProvider>
    </OrganizationProvider>
  );
}