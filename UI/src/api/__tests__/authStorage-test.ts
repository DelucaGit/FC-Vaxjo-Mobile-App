import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetMemoryStores } from '../../test/inMemoryKv';
import {
  clearSession,
  getToken,
  loadSession,
  saveSession,
  type AuthSession,
} from '../authStorage';
import { getAccessToken, getRefreshToken, setAccessToken } from '../tokenStorage';

const SESSION_KEY = 'fcvaxjo_session';

const profile = {
  roleName: 'COACH',
  email: 'coach@fcvaxjo.se',
  userId: 7,
  mustChangePassword: false,
};

function session(token: string): AuthSession {
  return { token, ...profile };
}

describe('authStorage', () => {
  beforeEach(() => {
    resetMemoryStores();
  });

  test('saveSession writes the profile without the token and puts the token in secure store', async () => {
    await setAccessToken('old-access');
    await saveSession(session('new-access'));

    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string) as Record<string, unknown>;
    expect(stored).toEqual(profile);
    expect(stored.token).toBeUndefined();
    expect(raw).not.toContain('new-access');
    expect(await getAccessToken()).toBe('new-access');
    expect(await getRefreshToken()).toBeNull();
  });

  test('saveSession refuses an empty token and leaves the previous session alone', async () => {
    await saveSession(session('kept-access'));

    await expect(saveSession(session('   '))).rejects.toThrow('Token must not be empty');

    expect(await getAccessToken()).toBe('kept-access');
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain('token');
  });

  test('moves a legacy access token and refresh token out of AsyncStorage', async () => {
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...profile,
        token: 'legacy-access',
        refreshToken: 'legacy-refresh',
      }),
    );

    const loaded = await loadSession();

    expect(loaded).toEqual(session('legacy-access'));
    expect(await getAccessToken()).toBe('legacy-access');
    expect(await getRefreshToken()).toBe('legacy-refresh');

    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string) as Record<string, unknown>;
    expect(stored).toEqual(profile);
    expect(raw).not.toContain('legacy-access');
    expect(raw).not.toContain('legacy-refresh');
  });

  test('keeps the secure-store token when a legacy copy is also present', async () => {
    await setAccessToken('newer-access');
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...profile, token: 'older-access' }),
    );

    const loaded = await loadSession();

    expect(loaded?.token).toBe('newer-access');
    expect(await getAccessToken()).toBe('newer-access');
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain('older-access');
    expect(raw).not.toContain('token');
  });

  test('deletes a legacy blob that is not a full profile, and does not keep its token', async () => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'orphan-access' }));

    expect(await loadSession()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await getAccessToken()).toBeNull();
  });

  test('deletes a legacy value that is not JSON', async () => {
    await AsyncStorage.setItem(SESSION_KEY, 'not-json');

    expect(await loadSession()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });

  test('loads a profile that was already stored without a token', async () => {
    await setAccessToken('stored-access');
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));

    expect(await loadSession()).toEqual(session('stored-access'));
    expect(await getToken()).toBe('stored-access');
  });

  test('returns null from getToken when the profile is missing', async () => {
    await setAccessToken('orphan-access');

    expect(await getToken()).toBeNull();
    expect(await getAccessToken()).toBe('orphan-access');
  });

  test('clearSession removes tokens and the profile', async () => {
    await saveSession(session('access-to-clear'));

    await clearSession();

    expect(await loadSession()).toBeNull();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
