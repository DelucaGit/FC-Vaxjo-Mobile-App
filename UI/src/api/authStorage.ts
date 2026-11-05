import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearEmail,
  clearRefreshToken,
  clearTokens,
  getAccessToken,
  getEmail,
  getRefreshToken,
  setAccessToken,
  setEmail,
  setRefreshToken,
} from './tokenStorage';

/**
 * Plain-text profile: role, user id, and must-change-password.
 *
 * Why these three stay in AsyncStorage: the app needs them to pick tabs,
 * load "me", and show the change-password gate. They are not contact data.
 *
 * Email is personal data, so it is saved by tokenStorage (SecureStore),
 * same as the tokens. Logout clears it there.
 *
 * Why the migration: older builds saved the JWT and the email inside
 * fcvaxjo_session. Phones that already logged in still have that JSON.
 * On the next open we copy those values into SecureStore and write the
 * profile back without them, so they are not left in plain text.
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
    typeof record.userId === 'number' &&
    Number.isFinite(record.userId) &&
    typeof record.mustChangePassword === 'boolean'
  );
}

function toProfile(session: AuthSession): SessionProfile {
  return {
    roleName: session.roleName,
    userId: session.userId,
    mustChangePassword: session.mustChangePassword,
  };
}

function storedText(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value;
}

async function moveLegacySecretsOutOfAsyncStorage(): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON. Drop it so a broken value cannot hide a token or an email.
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  if (!parsed || typeof parsed !== 'object') {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  const record = parsed as Record<string, unknown>;

  // A secret without role and user id cannot rebuild a session.
  // Delete the whole value so the secret does not stay in plain text.
  if (!isProfile(record)) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  const hasSecretField = 'token' in record || 'refreshToken' in record || 'email' in record;
  if (!hasSecretField) {
    return;
  }

  const legacyAccessToken = storedText(record, 'token');
  const legacyRefreshToken = storedText(record, 'refreshToken');
  const legacyEmail = storedText(record, 'email');

  // SecureStore wins when it already has a value. That copy was written
  // by this version of the app. The AsyncStorage copy is the old one.
  if (legacyAccessToken && !(await getAccessToken())) {
    await setAccessToken(legacyAccessToken);
  }
  if (legacyRefreshToken && !(await getRefreshToken())) {
    await setRefreshToken(legacyRefreshToken);
  }
  if (legacyEmail && !(await getEmail())) {
    await setEmail(legacyEmail);
  }

  const profile: SessionProfile = {
    roleName: record.roleName,
    userId: record.userId,
    mustChangePassword: record.mustChangePassword,
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
}

export async function saveSession(session: AuthSession): Promise<void> {
  // Check first, so a blank value cannot wipe a real session.
  // Secrets are saved before the profile. If SecureStore rejects the
  // write, the profile on disk stays as it was.
  if (session.token.trim() === '') {
    throw new Error('Token must not be empty');
  }
  if (session.email.trim() === '') {
    throw new Error('Email must not be empty');
  }

  await setAccessToken(session.token);
  await setEmail(session.email);
  // Login and refresh return a new JWT only. Drop any previous refresh
  // token so it cannot outlive this session.
  await clearRefreshToken();
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(toProfile(session)));
}

export async function loadSession(): Promise<AuthSession | null> {
  await moveLegacySecretsOutOfAsyncStorage();

  const token = await getAccessToken();
  const email = await getEmail();
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw || !token || !email) {
    return null;
  }

  try {
    const profile: unknown = JSON.parse(raw);
    if (!isProfile(profile)) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { ...profile, token, email };
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await clearTokens();
  await clearEmail();
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** Access token for API calls. Null when the user is logged out. */
export async function getToken(): Promise<string | null> {
  const session = await loadSession();
  return session?.token ?? null;
}
