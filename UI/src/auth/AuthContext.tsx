import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { changePassword as apiChangePassword, login as apiLogin, logout as apiLogout } from '../api/auth';
import { AuthSession, loadSession } from '../api/authStorage';
import { setOnUnauthorized } from '../api/http';

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  // When apiFetch refresh fails, drop React session so LoginScreen shows.
  useEffect(() => {
    setOnUnauthorized(() => setSession(null));
    return () => setOnUnauthorized(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await apiLogin(email, password);
    setSession(next);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const next = await apiChangePassword(currentPassword, newPassword);
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, login, changePassword, logout }),
    [session, loading, login, changePassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
