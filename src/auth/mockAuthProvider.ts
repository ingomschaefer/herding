import { createContext, useContext, useEffect, useState } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string } | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<string>;
}

// Mock token generation
const generateToken = (expiresIn: number): string => {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000),
  };
  return btoa(JSON.stringify(payload));
};

// Mock token validation
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token));
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
};

const INITIAL_STATE: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_STATE);

  // Mock login function
  const login = async (email: string, password: string) => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate tokens (access token expires in 1 minute, refresh token in 1 day)
    const accessToken = generateToken(60); // 1 minute
    const refreshToken = generateToken(86400); // 24 hours

    setAuthState({
      isAuthenticated: true,
      accessToken,
      refreshToken,
      user: { id: '1', email },
    });
  };

  // Mock token refresh
  const refreshAccessToken = async (): Promise<string> => {
    if (!authState.refreshToken || isTokenExpired(authState.refreshToken)) {
      throw new Error('Refresh token is invalid or expired');
    }

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newAccessToken = generateToken(60);
    setAuthState((prev) => ({
      ...prev,
      accessToken: newAccessToken,
    }));

    return newAccessToken;
  };

  const logout = () => {
    setAuthState(INITIAL_STATE);
  };

  // Auto refresh token when it's about to expire
  useEffect(() => {
    if (!authState.accessToken) return;

    const checkTokenExpiration = async () => {
      if (isTokenExpired(authState.accessToken)) {
        try {
          await refreshAccessToken();
        } catch (error) {
          logout();
        }
      }
    };

    const interval = setInterval(checkTokenExpiration, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [authState.accessToken]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};