import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useOrganization } from "./OrganizationContext";

interface AuthState {
  [organizationId: number]: {
    isAuthenticated: boolean;
    user?: any;
    timestamp: number;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (userData: any) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useOrganization();
  const [authState, setAuthState] = useState<AuthState>({});
  const [isLoading, setIsLoading] = useState(false);

  // 조직별 인증 상태 가져오기
  const currentAuth = organizationId ? authState[organizationId] : null;
  
  // 데모 조직(ID=3)인 경우 localStorage에서 직접 확인
  let isAuthenticated = currentAuth?.isAuthenticated || false;
  let user = currentAuth?.user;
  
  if (organizationId === 3 && !isAuthenticated) {
    const demoAuth = localStorage.getItem('auth_3');
    if (demoAuth) {
      try {
        const parsed = JSON.parse(demoAuth);
        if (parsed.isAuthenticated) {
          isAuthenticated = true;
          user = parsed.user;
          
          // AuthState에도 반영
          setAuthState(prev => ({
            ...prev,
            [3]: parsed
          }));
        }
      } catch (error) {
        console.error('Failed to parse demo auth:', error);
      }
    }
  }
  

  // 조직 변경 시 인증 상태 확인
  useEffect(() => {
    if (!organizationId) return;

    // 로컬 스토리지에서 조직별 인증 상태 복원
    const savedAuthState = localStorage.getItem(`auth_${organizationId}`);
    
    if (savedAuthState) {
      try {
        const parsed = JSON.parse(savedAuthState);
        // 1시간 이내의 인증만 유효하다고 가정
        if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          setAuthState(prev => ({
            ...prev,
            [organizationId]: parsed
          }));
          return;
        }
      } catch (error) {
        console.error("Failed to parse auth state:", error);
      }
    }

    // 인증 상태가 없으면 기본값 설정
    setAuthState(prev => ({
      ...prev,
      [organizationId]: {
        isAuthenticated: false,
        timestamp: Date.now()
      }
    }));
  }, [organizationId]);

  const login = (userData: any) => {
    if (!organizationId) return;

    const newAuthState = {
      isAuthenticated: true,
      user: userData,
      timestamp: Date.now()
    };

    setAuthState(prev => ({
      ...prev,
      [organizationId]: newAuthState
    }));

    // 로컬 스토리지에 저장
    localStorage.setItem(`auth_${organizationId}`, JSON.stringify(newAuthState));
  };

  const logout = () => {
    if (!organizationId) return;

    setAuthState(prev => ({
      ...prev,
      [organizationId]: {
        isAuthenticated: false,
        timestamp: Date.now()
      }
    }));

    // 로컬 스토리지에서 제거
    localStorage.removeItem(`auth_${organizationId}`);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}