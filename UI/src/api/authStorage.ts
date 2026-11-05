import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearRefreshToken,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './tokenStorage';

/**
 * The profile (role, email, user id, must-change-password) stays in
 * AsyncStorage. The tokens do not. They are saved by tokenStorage.
 *
 * Why the migration: older builds saved the whole session, JWT included,
 * as one JSON value. Phones that already logged in still have that value.
 * On the next open we copy the token into SecureStore and write the
 * profile back without it, so the JWT is not left in plain text.
 */

const SESSION_KEY = 'fcvaxjo_session';

export type AuthSession = {
  token: string;
  roleName: string;
  email: string;
  userId: number;
  mustChangePassword: boolean;
};

type SessionProfile = {
  roleName: string;
  email: string;
  userId: number;
  mustChangePassword: boolean;
};

function isProfile(value: unknown): value is SessionProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.roleName === 'string' &&
    record.roleName.length > 0 &&
    typeof record.email === 'string' &&
    typeof record.userId === 'number' &&
    Number.isFinite(record.userId) &&
    typeof record.mustChangePassword === 'boolean'
  );
}

function toProfile(session: AuthSession): SessionProfile {
  return {
    roleName: session.roleName,
    email: session.email,
    userId: session.userId,
    mustChangePassword: session.mustChangePassword,
  };
}

function storedToken(record: Record<string, unknown>, field: 'token' | 'refreshToken'): string | null {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value;
}

async function moveLegacyTokensOutOfAsyncStorage(): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON. Drop it so a broken value cannot hide a token.
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  if (!parsed || typeof parsed !== 'object') {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  const record = parsed as Record<string, unknown>;

  // A token without role/email/id cannot rebuild a session.
  // Delete the whole value so the token does not stay in plain text.
  if (!isProfile(record)) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  const hasTokenField = 'token' in record || 'refreshToken' in record;
  if (!hasTokenField) {
    return;
  }

  const legacyAccessToken = storedToken(record, 'token');
  const legacyRefreshToken = storedToken(record, 'refreshToken');

  // SecureStore wins when it already has a token. That copy was written
  // by this version of the app. The AsyncStorage copy is the old one.
  if (legacyAccessToken && !(await getAccessToken())) {
    await setAccessToken(legacyAccessToken);
  }
  if (legacyRefreshToken && !(await getRefreshToken())) {
    await setRefreshToken(legacyRefreshToken);
  }

  const profile: SessionProfile = {
    roleName: record.roleName,
    email: record.email,
    userId: record.userId,
    mustChangePassword: record.mustChangePassword,
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
}

export async function saveSession(session: AuthSession): Promise<void> {
  // Blank check first, so an empty token cannot wipe a real session.
  // The token is saved before the profile. If SecureStore rejects the
  // write, the profile on disk stays as it was.
  if (session.token.trim() === '') {
    throw new Error('Token must not be empty');
  }

  await setAccessToken(session.token);
  // Login and refresh return a new JWT only. Drop any previous refresh
  // token so it cannot outlive this session.
  await clearRefreshToken();
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(toProfile(session)));
}

export async function loadSession(): Promise<AuthSession | null> {
  await moveLegacyTokensOutOfAsyncStorage();

  const token = await getAccessToken();
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw || !token) {
    return null;
  }

  try {
    const profile: unknown = JSON.parse(raw);
    if (!isProfile(profile)) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { ...profile, token };
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await clearTokens();
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** Access token for API calls. Null when the user is logged out. */
export async function getToken(): Promise<string | null> {
  const session = await loadSession();
  return session?.token ?? null;
}
