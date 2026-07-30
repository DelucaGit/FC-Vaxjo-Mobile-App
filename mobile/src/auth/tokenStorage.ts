import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fcvaxjo_jwt';

/**
 * On phones we use SecureStore (encrypted-ish device storage).
 * On web (Docker browser test) we fall back to sessionStorage
 * so the token disappears when the tab closes.
 */
export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    sessionStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
