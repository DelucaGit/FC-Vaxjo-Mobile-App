import * as SecureStore from 'expo-secure-store';

/**
 * The access token and the refresh token live here.
 *
 * Why not AsyncStorage: it stores plain text. The access token is the
 * login, so it goes in the iOS keychain / Android keystore (SecureStore).
 * The rest of the app calls these functions and does not import SecureStore.
 *
 * The API today returns one JWT and replaces it on POST /auth/refresh.
 * There is no separate refresh token in the contract yet. The refresh
 * functions are here so logout can wipe both slots, and so a later API
 * can store a real refresh token in this one file.
 *
 * Web preview has no keychain (isAvailableAsync is false). The tokens
 * then stay in memory for this browser tab. They are still not written
 * to AsyncStorage.
 */

const ACCESS_TOKEN_KEY = 'fcvaxjo_access_token';
const REFRESH_TOKEN_KEY = 'fcvaxjo_refresh_token';

let webAccessToken: string | null = null;
let webRefreshToken: string | null = null;

function rejectEmptyToken(token: string): void {
  if (token.trim() === '') {
    throw new Error('Token must not be empty');
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!(await SecureStore.isAvailableAsync())) {
    return webAccessToken;
  }
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  rejectEmptyToken(token);
  if (!(await SecureStore.isAvailableAsync())) {
    webAccessToken = token;
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (!(await SecureStore.isAvailableAsync())) {
    return webRefreshToken;
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  rejectEmptyToken(token);
  if (!(await SecureStore.isAvailableAsync())) {
    webRefreshToken = token;
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  if (!(await SecureStore.isAvailableAsync())) {
    webAccessToken = null;
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function clearRefreshToken(): Promise<void> {
  if (!(await SecureStore.isAvailableAsync())) {
    webRefreshToken = null;
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await clearAccessToken();
  await clearRefreshToken();
}
