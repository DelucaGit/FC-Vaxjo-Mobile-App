import { Platform } from 'react-native';

/**
 * Where the Java API lives.
 *
 * - Web / iOS simulator: localhost works.
 * - Android emulator: 10.0.2.2 is the PC (not localhost).
 * - Real phone (Expo Go): localhost is the phone. Put your PC's
 *   LAN IP below (e.g. 192.168.1.20) and set useLanIp to true.
 */
const useLanIp = false;
const lanIp = '192.168.1.20';

function getApiHost(): string {
  if (useLanIp) {
    return lanIp;
  }
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
}

/**
 * The built phone app (APK) talks to the server on Render. EAS sets
 * EXPO_PUBLIC_API_URL for that build (see eas.json), for example
 * https://fcvaxjo-api.onrender.com/api. Expo copies the value into the app
 * when it is built. When the variable is missing (daily work on the PC), the
 * local addresses above are used like before.
 */
const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = configuredUrl
  ? configuredUrl.replace(/\/+$/, '')
  : `http://${getApiHost()}:8080/api`;
