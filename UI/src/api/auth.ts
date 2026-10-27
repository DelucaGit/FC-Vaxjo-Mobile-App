import { API_BASE_URL } from './config';
import { AuthSession, clearSession, saveSession } from './authStorage';
import { apiFetch, readErrorMessage } from './http';

export type LoginResult = AuthSession;

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as {
    token: string;
    userId: number;
    email: string;
    roleName: string;
    mustChangePassword: boolean;
  };

  const session: AuthSession = {
    token: data.token,
    userId: data.userId,
    email: data.email,
    roleName: data.roleName,
    mustChangePassword: data.mustChangePassword,
  };
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

  const data = (await response.json()) as {
    token: string;
    userId: number;
    email: string;
    roleName: string;
    mustChangePassword: boolean;
  };

  const session: AuthSession = {
    token: data.token,
    userId: data.userId,
    email: data.email,
    roleName: data.roleName,
    mustChangePassword: data.mustChangePassword,
  };
  await saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  await clearSession();
}
