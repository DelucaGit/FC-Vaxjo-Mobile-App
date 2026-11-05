import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { resetMemoryStores } from '../../test/inMemoryKv';
import {
  clearAccessToken,
  clearRefreshToken,
  clearEmail,
  clearTokens,
  getAccessToken,
  getEmail,
  getRefreshToken,
  setAccessToken,
  setEmail,
  setRefreshToken,
} from '../tokenStorage';

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

async function clearPhoneAndWebSecrets(): Promise<void> {
  secureStore.isAvailableAsync.mockResolvedValue(false);
  await clearTokens();
  await clearEmail();
  secureStore.isAvailableAsync.mockResolvedValue(true);
  await clearTokens();
  await clearEmail();
}

describe('tokenStorage', () => {
  beforeEach(async () => {
    resetMemoryStores();
    await clearPhoneAndWebSecrets();
  });

  test('saves and reads the access token and the refresh token separately', async () => {
    await setAccessToken('access-one');
    await setRefreshToken('refresh-one');

    expect(await getAccessToken()).toBe('access-one');
    expect(await getRefreshToken()).toBe('refresh-one');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('fcvaxjo_access_token', 'access-one');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('fcvaxjo_refresh_token', 'refresh-one');
  });

  test('clearTokens removes both tokens', async () => {
    await setAccessToken('access-one');
    await setRefreshToken('refresh-one');

    await clearTokens();

    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
  });

  test('clearing one token leaves the other', async () => {
    await setAccessToken('access-one');
    await setRefreshToken('refresh-one');

    await clearAccessToken();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBe('refresh-one');

    await clearRefreshToken();
    expect(await getRefreshToken()).toBeNull();
  });

  test('does not store a blank token or a blank email', async () => {
    await expect(setAccessToken('   ')).rejects.toThrow('Token must not be empty');
    await expect(setRefreshToken('')).rejects.toThrow('Token must not be empty');
    await expect(setEmail('   ')).rejects.toThrow('Email must not be empty');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('saves and clears the signed-in email on its own', async () => {
    await setEmail('coach@fcvaxjo.se');

    expect(await getEmail()).toBe('coach@fcvaxjo.se');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'fcvaxjo_signed_in_email',
      'coach@fcvaxjo.se',
    );

    await clearEmail();
    expect(await getEmail()).toBeNull();
  });

  test('on web, keeps tokens in memory and not in AsyncStorage', async () => {
    secureStore.isAvailableAsync.mockResolvedValue(false);

    await setAccessToken('web-access');
    await setRefreshToken('web-refresh');
    await setEmail('coach@fcvaxjo.se');

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('fcvaxjo_session')).toBeNull();
    expect(await getAccessToken()).toBe('web-access');
    expect(await getRefreshToken()).toBe('web-refresh');
    expect(await getEmail()).toBe('coach@fcvaxjo.se');

    await clearTokens();
    await clearEmail();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(await getEmail()).toBeNull();
  });
});
