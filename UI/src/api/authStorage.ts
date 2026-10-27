import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'fcvaxjo_token';
const ROLE_KEY = 'fcvaxjo_role';
const MUST_CHANGE_KEY = 'fcvaxjo_must_change';
const EMAIL_KEY = 'fcvaxjo_email';
const USER_ID_KEY = 'fcvaxjo_user_id';

export type AuthSession = {
  token: string;
  roleName: string;
  email: string;
  userId: number;
  mustChangePassword: boolean;
};

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, session.token],
    [ROLE_KEY, session.roleName],
    [EMAIL_KEY, session.email],
    [USER_ID_KEY, String(session.userId)],
    [MUST_CHANGE_KEY, session.mustChangePassword ? '1' : '0'],
  ]);
}

export async function loadSession(): Promise<AuthSession | null> {
  const pairs = await AsyncStorage.multiGet([
    TOKEN_KEY,
    ROLE_KEY,
    EMAIL_KEY,
    USER_ID_KEY,
    MUST_CHANGE_KEY,
  ]);
  const map = Object.fromEntries(pairs);
  if (!map[TOKEN_KEY]) {
    return null;
  }
  return {
    token: map[TOKEN_KEY]!,
    roleName: map[ROLE_KEY] ?? '',
    email: map[EMAIL_KEY] ?? '',
    userId: Number(map[USER_ID_KEY] ?? 0),
    mustChangePassword: map[MUST_CHANGE_KEY] === '1',
  };
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    ROLE_KEY,
    EMAIL_KEY,
    USER_ID_KEY,
    MUST_CHANGE_KEY,
  ]);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
