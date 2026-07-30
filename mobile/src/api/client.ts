import { AuthResponse, Player, Team, User } from '../types';
import { readToken } from '../auth/tokenStorage';

/**
 * API base URL comes from Expo public env (safe to expose — not a secret).
 * Secrets like JWT stay on the device after login, never in source code.
 */
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await readToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  listTeams() {
    return request<Team[]>('/api/teams');
  },

  listPlayers(teamId?: number) {
    const query = teamId ? `?teamId=${teamId}` : '';
    return request<Player[]>(`/api/players${query}`);
  },

  createTeam(input: { name: string; ageGroup?: string; season?: string }) {
    return request<Team>('/api/teams', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  createPlayer(input: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    jerseyNumber?: number;
    teamId?: number;
  }) {
    return request<Player>('/api/players', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  listUsers() {
    return request<User[]>('/api/users');
  },
};

export function getApiBaseUrl() {
  return API_URL;
}
