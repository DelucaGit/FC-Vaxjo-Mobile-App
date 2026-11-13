import { API_BASE_URL } from './config';
import { AuthSession, clearSession, getToken, saveSession } from './authStorage';
import { apiFetch, readErrorMessage, setRefreshSession } from './http';

export type LoginResult = AuthSession;

function toSession(data: {
  token: string;
  userId: number;
  email: string;
  roleName: string;
  mustChangePassword: boolean;
}): AuthSession {
  return {
    token: data.token,
    userId: data.userId,
    email: data.email,
    roleName: data.roleName,
    mustChangePassword: data.mustChangePassword,
  };
}

/** Shown when the API locks login after too many failed attempts (HTTP 429). */
export const TOO_MANY_LOGIN_ATTEMPTS_MESSAGE =
  'För många inloggningsförsök. Försök igen om 15 minuter.';

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 429) {
    // Fixed text, so the user gets Swedish even if a proxy sends its own 429 body.
    throw new Error(TOO_MANY_LOGIN_ATTEMPTS_MESSAGE);
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const session = toSession(await response.json());
  await saveSession(session);
  return session;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<LoginResult> {
  const response = await apiFetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const session = toSession(await response.json());
  await saveSession(session);
  return session;
}

/**
 * Exchange a still-valid access token for a new one (another 120 minutes).
 * The API has no separate refresh token. The Bearer value is the current JWT.
 * Uses raw fetch so the 401 retry inside apiFetch does not call itself.
 */
export async function refreshSession(): Promise<LoginResult> {
  const token = await getToken();
  if (!token) {
    throw new Error('No session to refresh');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const session = toSession(await response.json());
  await saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  await clearSession();
}

// Register after refreshSession exists. A 401 in apiFetch calls this.
setRefreshSession(refreshSession);
