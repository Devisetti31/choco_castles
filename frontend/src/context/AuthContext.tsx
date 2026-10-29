import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { UserAccount } from '../types/store';

const TOKEN_STORAGE_KEY = 'the_creative_castles_auth_token';
const USER_STORAGE_KEY = 'the_creative_castles_auth_user';

interface AuthContextType {
  user: UserAccount | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<UserAccount>;
  register: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<UserAccount>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (data: Partial<UserAccount>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Validate existing token with /api/auth/me on mount
  const refreshUser = useCallback(async () => {
    const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!currentToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          return;
        }
      }

      // If invalid/expired token, clear stored session
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      setToken(null);
      setUser(null);
    } catch {
      // Offline fallback: keep cached user state
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<UserAccount> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || data.detail || 'Failed to sign in.');
      }

      const receivedUser: UserAccount = data.user;
      const receivedToken: string = data.token;

      setToken(receivedToken);
      setUser(receivedUser);

      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
      } catch {
        // Ignore quota issues
      }

      return receivedUser;
    },
    []
  );

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      phone?: string;
      password: string;
    }): Promise<UserAccount> => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          data.error || data.detail || 'Registration failed. Please check your details.'
        );
      }

      const receivedUser: UserAccount = data.user;
      const receivedToken: string = data.token;

      setToken(receivedToken);
      setUser(receivedUser);

      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
      } catch {
        // Ignore quota issues
      }

      return receivedUser;
    },
    []
  );

  const logout = useCallback(async () => {
    const currentToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (currentToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch {
        // Ignore network failure on logout
      }
    }

    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore
    }

    setToken(null);
    setUser(null);
  }, [token]);

  const updateUser = useCallback((updated: Partial<UserAccount>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const isAuthenticated = Boolean(user && token);
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoginModalOpen,
        setIsLoginModalOpen,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

