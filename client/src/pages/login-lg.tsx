import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function LoginLG() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      // LG전자 조직용 간단한 인증 로직
      if (username === "lg" && password === "lg123") {
        
        // 모든 localStorage 데이터 정리
        localStorage.clear();
        
        // LG전자 조직(ID=4)에만 인증 상태 저장
        const authState = {
          isAuthenticated: true,
          user: {
            id: 2,
            email: "lg", 
            name: "LG전자 사용자",
            organizationId: 4
          },
          timestamp: Date.now()
        };
        
        localStorage.setItem('auth_4', JSON.stringify(authState));
        
        toast({
          title: "로그인 성공", 
          description: "LG전자 시스템으로 이동합니다...",
        });
        
        // 즉시 이동
        window.location.href = "/org/LG";
        
      } else {
        setError("아이디: lg, 비밀번호: lg123을 입력하세요.");
        setIsLoading(false);
      }
    } catch (error) {
      setError("로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">LG전자</h1>
            <p className="text-sm text-gray-600 mt-1">IR CRM 시스템</p>
          </div>
          <CardTitle className="text-xl text-center">로그인</CardTitle>
          <CardDescription className="text-center">
            LG전자 계정으로 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">사용자명</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="사용자명을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>LG전자 조직 전용 로그인</p>
            <p className="mt-2">
              <span className="text-blue-600">테스트 계정:</span> lg / lg123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}