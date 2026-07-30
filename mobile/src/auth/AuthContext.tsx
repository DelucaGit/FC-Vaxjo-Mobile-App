import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { api } from '../api/client';
import { User } from '../types';
import { clearToken, readToken, saveToken } from './tokenStorage';

const USER_KEY = 'fcvaxjo_user';

type AuthContextValue = {
  user: User | null;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const token = await readToken();
        const profile = await readUserProfile();
        if (active && token && profile) {
          setUser(profile);
        }
      } finally {
        if (active) {
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email.trim(), password);
    await saveToken(result.token);
    await saveUserProfile(result.user);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      const result = await api.register(input);
      await saveToken(result.token);
      await saveUserProfile(result.user);
      setUser(result.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await clearToken();
    await clearUserProfile();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, bootstrapping, login, register, logout }),
    [user, bootstrapping, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

async function saveUserProfile(user: User) {
  const value = JSON.stringify(user);
  if (Platform.OS === 'web') {
    sessionStorage.setItem(USER_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, value);
}

async function readUserProfile(): Promise<User | null> {
  const raw =
    Platform.OS === 'web'
      ? sessionStorage.getItem(USER_KEY)
      : await SecureStore.getItemAsync(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

async function clearUserProfile() {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(USER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(USER_KEY);
}
