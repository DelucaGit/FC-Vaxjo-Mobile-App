import { clearSession, getToken } from './authStorage';

/** Shared helper so API modules can show the server "message" field. */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return `Request failed (${response.status})`;
    }
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) {
        return json.message;
      }
    } catch {
      // not JSON — use raw text
    }
    return text;
  } catch {
    return `Request failed (${response.status})`;
  }
}

type UnauthorizedHandler = () => void;
type RefreshSession = () => Promise<unknown>;

let onUnauthorized: UnauthorizedHandler | null = null;
let refreshCurrentSession: RefreshSession | null = null;

/** AuthProvider registers this so a failed refresh clears React session state. */
export function setOnUnauthorized(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

/**
 * auth.ts calls this. http.ts must not import auth.ts, because auth.ts
 * already imports apiFetch. A direct import would be a circle.
 */
export function setRefreshSession(refresh: RefreshSession | null): void {
  refreshCurrentSession = refresh;
}

/**
 * fetch wrapper that attaches the access token when the user is logged in.
 * On 401: ask for a new access token once and retry. If that fails, clear
 * the secure-store tokens and the saved profile.
 */
export async function apiFetch(
  url: string,
  init: RequestInit = {},
  alreadyRetried = false,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status !== 401 || alreadyRetried) {
    return response;
  }

  // Avoid infinite loop if refresh itself returns 401.
  if (url.includes('/auth/refresh')) {
    await clearSession();
    onUnauthorized?.();
    return response;
  }

  try {
    if (!refreshCurrentSession) {
      throw new Error('Refresh is not set up');
    }
    await refreshCurrentSession();
    return apiFetch(url, init, true);
  } catch {
    await clearSession();
    onUnauthorized?.();
    return response;
  }
}
