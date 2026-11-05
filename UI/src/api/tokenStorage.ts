import * as SecureStore from 'expo-secure-store';

/**
 * Secrets for the signed-in user live here.
 *
 * Why not AsyncStorage: it stores plain text. The access token is the
 * login. The email is personal data (who is signed in). Both go in the
 * iOS keychain / Android keystore (SecureStore). The rest of the app
 * calls these functions and does not import SecureStore.
 *
 * The API today returns one JWT and replaces it on POST /auth/refresh.
 * There is no separate refresh token in the contract yet. The refresh
 * functions are here so logout can wipe both slots, and so a later API
 * can store a real refresh token in this one file.
 *
 * Web preview has no keychain (isAvailableAsync is false). The values
 * then stay in memory for this browser tab. They are still not written
 * to AsyncStorage.
 */

const ACCESS_TOKEN_KEY = 'fcvaxjo_access_token';
const REFRESH_TOKEN_KEY = 'fcvaxjo_refresh_token';
const EMAIL_KEY = 'fcvaxjo_signed_in_email';

let webAccessToken: string | null = null;
let webRefreshToken: string | null = null;
let webEmail: string | null = null;

function rejectEmpty(value: string, label: string): void {
  if (value.trim() === '') {
    throw new Error(`${label} must not be empty`);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!(await SecureStore.isAvailableAsync())) {
    return webAccessToken;
  }
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  rejectEmpty(token, 'Token');
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
  rejectEmpty(token, 'Token');
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

export async function getEmail(): Promise<string | null> {
  if (!(await SecureStore.isAvailableAsync())) {
    return webEmail;
  }
  return SecureStore.getItemAsync(EMAIL_KEY);
}

export async function setEmail(email: string): Promise<void> {
  rejectEmpty(email, 'Email');
  if (!(await SecureStore.isAvailableAsync())) {
    webEmail = email;
    return;
  }
  await SecureStore.setItemAsync(EMAIL_KEY, email);
}

export async function clearEmail(): Promise<void> {
  if (!(await SecureStore.isAvailableAsync())) {
    webEmail = null;
    return;
  }
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}
