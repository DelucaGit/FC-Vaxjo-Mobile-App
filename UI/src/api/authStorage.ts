import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * One key holds the whole session as JSON.
 * AsyncStorage v3 on web no longer has multiSet/multiGet.
 */
const SESSION_KEY = 'fcvaxjo_session';

export type AuthSession = {
  token: string;
  roleName: string;
  email: string;
  userId: number;
  mustChangePassword: boolean;
};

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getToken(): Promise<string | null> {
  const session = await loadSession();
  return session?.token ?? null;
}
