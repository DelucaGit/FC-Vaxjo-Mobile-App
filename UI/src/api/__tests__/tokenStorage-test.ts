import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { resetMemoryStores } from '../../test/inMemoryKv';
import {
  clearAccessToken,
  clearRefreshToken,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../tokenStorage';

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

async function clearPhoneAndWebTokens(): Promise<void> {
  secureStore.isAvailableAsync.mockResolvedValue(false);
  await clearTokens();
  secureStore.isAvailableAsync.mockResolvedValue(true);
  await clearTokens();
}

describe('tokenStorage', () => {
  beforeEach(async () => {
    resetMemoryStores();
    await clearPhoneAndWebTokens();
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

  test('does not store a blank token', async () => {
    await expect(setAccessToken('   ')).rejects.toThrow('Token must not be empty');
    await expect(setRefreshToken('')).rejects.toThrow('Token must not be empty');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('on web, keeps tokens in memory and not in AsyncStorage', async () => {
    secureStore.isAvailableAsync.mockResolvedValue(false);

    await setAccessToken('web-access');
    await setRefreshToken('web-refresh');

    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('fcvaxjo_session')).toBeNull();
    expect(await getAccessToken()).toBe('web-access');
    expect(await getRefreshToken()).toBe('web-refresh');

    await clearTokens();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
  });
});
