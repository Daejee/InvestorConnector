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
  const isAuthenticated = currentAuth?.isAuthenticated || false;
  const user = currentAuth?.user;
  
  console.log(`🔍 Auth state check: orgId=${organizationId}, auth=${isAuthenticated}, currentAuth=`, currentAuth);

  // 조직 변경 시 인증 상태 확인
  useEffect(() => {
    if (!organizationId) return;

    console.log(`🔐 Checking auth for organization ${organizationId}`);

    // 로컬 스토리지에서 조직별 인증 상태 복원
    const savedAuthState = localStorage.getItem(`auth_${organizationId}`);
    console.log(`📱 Saved auth state for org ${organizationId}:`, savedAuthState);
    
    if (savedAuthState) {
      try {
        const parsed = JSON.parse(savedAuthState);
        // 1시간 이내의 인증만 유효하다고 가정
        if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          console.log(`✅ Valid auth found for org ${organizationId}, setting authenticated`);
          setAuthState(prev => ({
            ...prev,
            [organizationId]: parsed
          }));
          return;
        } else {
          console.log(`⏰ Auth expired for org ${organizationId}`);
        }
      } catch (error) {
        console.error("Failed to parse auth state:", error);
      }
    }

    // 인증 상태가 없으면 기본값 설정
    console.log(`❌ No valid auth for org ${organizationId}, setting unauthenticated`);
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

    console.log(`🔓 Logging in user for org ${organizationId}:`, userData);

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
    console.log(`💾 Auth state saved for org ${organizationId}`);
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