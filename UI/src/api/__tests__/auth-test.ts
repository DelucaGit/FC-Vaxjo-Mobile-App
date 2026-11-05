import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetMemoryStores } from '../../test/inMemoryKv';
import { changePassword, login, logout, refreshSession } from '../auth';
import { saveSession } from '../authStorage';
import { getAccessToken, getEmail, getRefreshToken, setRefreshToken } from '../tokenStorage';

const SESSION_KEY = 'fcvaxjo_session';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

const loginBody = {
  token: 'fresh-access',
  userId: 4,
  email: 'player@fcvaxjo.se',
  roleName: 'PLAYER',
  mustChangePassword: true,
};

describe('auth token flow', () => {
  beforeEach(() => {
    resetMemoryStores();
    globalThis.fetch = jest.fn() as typeof fetch;
  });

  test('login stores the access token in secure store and not in AsyncStorage', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, loginBody));

    const session = await login('player@fcvaxjo.se', 'correct-horse');

    expect(session.token).toBe('fresh-access');
    expect(await getAccessToken()).toBe('fresh-access');
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain('fresh-access');
    expect(raw).not.toContain('player@fcvaxjo.se');
    expect(await getEmail()).toBe('player@fcvaxjo.se');
    expect(JSON.parse(raw as string)).toEqual({
      roleName: 'PLAYER',
      userId: 4,
      mustChangePassword: true,
    });
  });

  test('login does not store a session when the server rejects the call', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue(jsonResponse(400, { message: 'Invalid email or password' }));

    await expect(login('player@fcvaxjo.se', 'wrong-horse')).rejects.toThrow('Invalid email or password');
    expect(await getAccessToken()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });

  test('refreshSession sends the current access token and replaces it', async () => {
    await saveSession({
      token: 'old-access',
      userId: 4,
      email: 'player@fcvaxjo.se',
      roleName: 'PLAYER',
      mustChangePassword: false,
    });
    await setRefreshToken('should-be-cleared');
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, { ...loginBody, token: 'rotated-access', mustChangePassword: false }),
    );

    const session = await refreshSession();

    expect(session.token).toBe('rotated-access');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer old-access' },
      }),
    );
    expect(await getAccessToken()).toBe('rotated-access');
    expect(await getRefreshToken()).toBeNull();
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain('rotated-access');
    expect(raw).not.toContain('old-access');
    expect(raw).not.toContain('player@fcvaxjo.se');
    expect(await getEmail()).toBe('player@fcvaxjo.se');
  });

  test('refreshSession fails when there is no saved session', async () => {
    await expect(refreshSession()).rejects.toThrow('No session to refresh');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('changePassword replaces the stored access token', async () => {
    await saveSession({
      token: 'old-access',
      userId: 4,
      email: 'player@fcvaxjo.se',
      roleName: 'PLAYER',
      mustChangePassword: true,
    });
    (globalThis.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(200, { ...loginBody, token: 'after-change', mustChangePassword: false }),
    );

    const session = await changePassword('old-horse', 'new-horse');

    expect(session.mustChangePassword).toBe(false);
    expect(await getAccessToken()).toBe('after-change');
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain('after-change');
    expect(raw).not.toContain('player@fcvaxjo.se');
    expect(JSON.parse(raw as string).mustChangePassword).toBe(false);
  });

  test('logout clears secure-store tokens and the profile', async () => {
    await saveSession({
      token: 'access-to-drop',
      userId: 4,
      email: 'player@fcvaxjo.se',
      roleName: 'PLAYER',
      mustChangePassword: false,
    });
    await setRefreshToken('refresh-to-drop');

    await logout();

    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(await getEmail()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
