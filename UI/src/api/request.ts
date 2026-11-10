import { API_BASE_URL } from './config';
import { apiFetch, readErrorMessage } from './http';

/**
 * Small helpers so every API module does the same three things:
 * call apiFetch (token + 401 refresh), throw the server's message
 * (403 "Access Denied" becomes Swedish), and parse the JSON answer.
 *
 * `path` starts after /api, for example `/trainings/5`.
 */
export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return (await response.json()) as T;
}

/** For calls that answer 204 No Content, such as DELETE. */
export async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

/** Body helper: method plus JSON body. Content-Type is set by apiFetch. */
export function withJson(method: 'POST' | 'PUT', body?: unknown): RequestInit {
  return body === undefined
    ? { method }
    : { method, body: JSON.stringify(body) };
}

/** `?childId=7`, or an empty string when there is no child. */
export function childQuery(childId?: number): string {
  return childId != null ? `?childId=${encodeURIComponent(String(childId))}` : '';
}
