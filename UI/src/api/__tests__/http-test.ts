import { resetMemoryStores } from '../../test/inMemoryKv';
import { refreshSession } from '../auth';
import { saveSession } from '../authStorage';
import { apiFetch, setOnUnauthorized, setRefreshSession } from '../http';
import { getAccessToken, getRefreshToken, setRefreshToken } from '../tokenStorage';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

const profile = {
  token: 'old-access',
  userId: 2,
  email: 'admin@fcvaxjo.se',
  roleName: 'ADMIN',
  mustChangePassword: false,
};

describe('apiFetch auth', () => {
  beforeEach(() => {
    resetMemoryStores();
    setOnUnauthorized(null);
    setRefreshSession(refreshSession);
    globalThis.fetch = jest.fn() as typeof fetch;
  });

  test('sends the access token from secure store', async () => {
    await saveSession(profile);
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiFetch('http://localhost:8080/api/users');

    const headers = new Headers((globalThis.fetch as jest.Mock).mock.calls[0][1].headers);
    expect(headers.get('Authorization')).toBe('Bearer old-access');
  });

  test('refreshes once on 401 and retries with the new access token', async () => {
    await saveSession(profile);
    await setRefreshToken('stale-refresh');
    (globalThis.fetch as jest.Mock).mockImplementation(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/auth/refresh')) {
        return jsonResponse(200, { ...profile, token: 'new-access' });
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer old-access') {
        return jsonResponse(401, { message: 'expired' });
      }
      return jsonResponse(200, { ok: true });
    });

    const response = await apiFetch('http://localhost:8080/api/users');

    expect(response.status).toBe(200);
    expect(await getAccessToken()).toBe('new-access');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  test('clears tokens and notifies the app when refresh fails', async () => {
    await saveSession(profile);
    await setRefreshToken('stale-refresh');
    const onUnauthorized = jest.fn();
    setOnUnauthorized(onUnauthorized);
    (globalThis.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (String(url).includes('/auth/refresh')) {
        return jsonResponse(401, { message: 'expired' });
      }
      return jsonResponse(401, { message: 'expired' });
    });

    const response = await apiFetch('http://localhost:8080/api/users');

    expect(response.status).toBe(401);
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  test('clears the session when the refresh URL itself returns 401', async () => {
    await saveSession(profile);
    const onUnauthorized = jest.fn();
    setOnUnauthorized(onUnauthorized);
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(401, { message: 'expired' }));

    const response = await apiFetch('http://localhost:8080/api/auth/refresh');

    expect(response.status).toBe(401);
    expect(await getAccessToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
