import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetMemoryStores } from '../../test/inMemoryKv';
import {
  clearSession,
  getToken,
  loadSession,
  saveSession,
  type AuthSession,
} from '../authStorage';
import { getAccessToken, getEmail, getRefreshToken, setAccessToken, setEmail } from '../tokenStorage';

const SESSION_KEY = 'fcvaxjo_session';
const email = 'coach@fcvaxjo.se';

const profile = {
  roleName: 'COACH',
  userId: 7,
  mustChangePassword: false,
};

function session(token: string): AuthSession {
  return { token, email, ...profile };
}

describe('authStorage', () => {
  beforeEach(() => {
    resetMemoryStores();
  });

  test('saveSession keeps role and user id in AsyncStorage and secrets in secure store', async () => {
    await setAccessToken('old-access');
    await saveSession(session('new-access'));

    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string) as Record<string, unknown>;
    expect(stored).toEqual(profile);
    expect(stored.token).toBeUndefined();
    expect(stored.email).toBeUndefined();
    expect(raw).not.toContain('new-access');
    expect(raw).not.toContain(email);
    expect(await getAccessToken()).toBe('new-access');
    expect(await getEmail()).toBe(email);
    expect(await getRefreshToken()).toBeNull();
  });

  test('saveSession refuses an empty token or email and leaves the previous session alone', async () => {
    await saveSession(session('kept-access'));

    await expect(saveSession(session('   '))).rejects.toThrow('Token must not be empty');
    await expect(saveSession({ ...session('other-access'), email: '   ' })).rejects.toThrow(
      'Email must not be empty',
    );

    expect(await getAccessToken()).toBe('kept-access');
    expect(await getEmail()).toBe(email);
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain('token');
    expect(raw).not.toContain(email);
  });

  test('moves a legacy token, refresh token, and email out of AsyncStorage', async () => {
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...profile,
        email,
        token: 'legacy-access',
        refreshToken: 'legacy-refresh',
      }),
    );

    const loaded = await loadSession();

    expect(loaded).toEqual(session('legacy-access'));
    expect(await getAccessToken()).toBe('legacy-access');
    expect(await getRefreshToken()).toBe('legacy-refresh');
    expect(await getEmail()).toBe(email);

    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string) as Record<string, unknown>;
    expect(stored).toEqual(profile);
    expect(raw).not.toContain('legacy-access');
    expect(raw).not.toContain('legacy-refresh');
    expect(raw).not.toContain(email);
  });

  test('keeps the secure-store token and email when a legacy copy is also present', async () => {
    await setAccessToken('newer-access');
    await setEmail('newer@fcvaxjo.se');
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...profile, email, token: 'older-access' }),
    );

    const loaded = await loadSession();

    expect(loaded?.token).toBe('newer-access');
    expect(loaded?.email).toBe('newer@fcvaxjo.se');
    expect(await getAccessToken()).toBe('newer-access');
    expect(await getEmail()).toBe('newer@fcvaxjo.se');
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain('older-access');
    expect(raw).not.toContain(email);
    expect(raw).not.toContain('newer@fcvaxjo.se');
  });

  test('deletes a legacy blob that is not a full profile, and does not keep its secrets', async () => {
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: 'orphan-access', email: 'orphan@fcvaxjo.se' }),
    );

    expect(await loadSession()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await getAccessToken()).toBeNull();
    expect(await getEmail()).toBeNull();
  });

  test('deletes a legacy value that is not JSON', async () => {
    await AsyncStorage.setItem(SESSION_KEY, 'not-json');

    expect(await loadSession()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });

  test('moves an email that was left in AsyncStorage after the token migration', async () => {
    await setAccessToken('stored-access');
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ ...profile, email }));

    expect(await loadSession()).toEqual(session('stored-access'));
    expect(await getToken()).toBe('stored-access');
    expect(await getEmail()).toBe(email);
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    expect(raw).not.toContain(email);
    expect(JSON.parse(raw as string)).toEqual(profile);
  });

  test('loads a profile that is already stored without secrets', async () => {
    await setAccessToken('stored-access');
    await setEmail(email);
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
    expect(await getEmail()).toBeNull();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
