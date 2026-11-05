import { clearSession, getToken } from './authStorage';

/**
 * A chairman already sees the coach screens (trainings, create a player
 * or a parent) for every team. The API still answers a bare 403
 * ("Access Denied") until that contract is updated. That text is not
 * useful on screen, so we replace only the generic refusal.
 * A specific reason, such as a coach opening the wrong team, stays as-is.
 */
const ROLE_NOT_READY_MESSAGE =
  'Den här funktionen är inte tillgänglig för din roll än.';

function isGenericForbidden(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === 'access denied' ||
    normalized === 'forbidden' ||
    normalized === 'request failed (403)'
  );
}

/** Shared helper so API modules can show the server "message" field. */
export async function readErrorMessage(response: Response): Promise<string> {
  const message = await readServerMessage(response);
  if (response.status === 403 && isGenericForbidden(message)) {
    return ROLE_NOT_READY_MESSAGE;
  }
  return message;
}

async function readServerMessage(response: Response): Promise<string> {
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

let onUnauthorized: UnauthorizedHandler | null = null;

/** AuthProvider registers this so a failed refresh clears React session state. */
export function setOnUnauthorized(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

/**
 * fetch wrapper that attaches the JWT when the user is logged in.
 * On 401: try refresh once, retry the request; if refresh fails, clear session.
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
    const { refreshSession } = await import('./auth');
    await refreshSession();
    return apiFetch(url, init, true);
  } catch {
    await clearSession();
    onUnauthorized?.();
    return response;
  }
}
