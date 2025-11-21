import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  demoEndDate?: string;
  gatewayDownloaded?: boolean;
  isDemoUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function CustomAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      // First check for sessionId (real authentication)
      const sessionId = localStorage.getItem('sessionId');
      
      if (sessionId) {
        try {
          // Verify session with backend
          const response = await apiRequest('GET', '/api/auth/verify');
          
          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              setUser({
                ...data.user,
                isDemoUser: false
              });
              setIsLoading(false);
              return;
            }
          } else {
            // Session invalid, clear it
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          localStorage.removeItem('sessionId');
        }
      }
      
      // Fall back to demo auth if no valid session
      const token = localStorage.getItem('demoKey');
      const userData = localStorage.getItem('demoUser');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser({
            ...parsedUser,
            isDemoUser: true
          });
        } catch (error) {
          console.error('Failed to parse user data:', error);
          localStorage.removeItem('demoKey');
          localStorage.removeItem('demoUser');
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuthentication();
  }, []);

  const login = (token: string, user: User) => {
    // Check if this is a real session or demo session
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      // Real authenticated user
      setUser({ ...user, isDemoUser: false });
    } else {
      // Demo user
      localStorage.setItem('demoKey', token);
      localStorage.setItem('demoUser', JSON.stringify(user));
      setUser({ ...user, isDemoUser: true });
    }
  };

  const logout = () => {
    // Clear all auth-related items
    localStorage.removeItem('sessionId');
    localStorage.removeItem('demoKey');
    localStorage.removeItem('demoUser');
    localStorage.removeItem('remainingDays');
    localStorage.removeItem('isDemoMode');
    localStorage.removeItem('demo-dashboard-layout');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useCustomAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useCustomAuth must be used within a CustomAuthProvider');
  }
  return context;
}