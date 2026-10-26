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

export const API_BASE_URL = `http://${getApiHost()}:8080/api`;
