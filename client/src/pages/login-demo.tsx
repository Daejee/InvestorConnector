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

function DemoLoginForm() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 중복 클릭 방지
    if (isLoading) return;
    setIsLoading(true);

    try {
      // 데모용 간단한 인증 로직
      if (email === "demo" && password === "demo") {
        
        // 간단한 데모 인증
        localStorage.setItem('demo_authenticated', 'true');
        
        toast({
          title: "로그인 성공", 
          description: "데모 대시보드로 이동합니다...",
        });
        
        // 데모 대시보드로 직접 이동 (즉시)
        window.location.href = "/demo-dashboard";
        
      } else {
        toast({
          title: "로그인 실패",
          description: "아이디: demo, 비밀번호: demo를 입력하세요.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-8">
          {/* 데모 회사 로고 영역 */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-gray-900">
              데모 회사
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
                  아이디
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="text"
                    placeholder="demo"
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
              className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium"
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

          {/* 데모 계정 정보 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">데모 계정 정보</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>아이디:</strong> demo</p>
              <p><strong>비밀번호:</strong> demo</p>
            </div>
          </div>

          {/* 푸터 */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>데모 회사 IR CRM 시스템</p>
            <p className="mt-1">© 2025 All rights reserved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DemoLogin() {
  return (
    <OrganizationProvider>
      <AuthProvider>
        <DemoLoginForm />
      </AuthProvider>
    </OrganizationProvider>
  );
}