import { Platform } from 'react-native';
import { baseURL } from './endpoint';

/**
 * Final API config used by axios and the app.
 * - Uses baseURL from endpoint.ts (updated by start-tunnel.sh or EXPO_PUBLIC_API_URL).
 * - If baseURL is still the placeholder, falls back to localhost (dev) or api.aipayroll.com (prod).
 * - Adds timeout, retry, token-refresh settings.
 */
const getDefaultApiUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') return 'https://10.0.2.2:7133';
    return 'https://localhost:7133';
  }
  return 'https://api.aipayroll.com';
};

// When baseURL is a real Cloudflare URL (set by start-tunnel.sh), use it. Otherwise use default (localhost/production).
const isCloudflareUrlSet = (url: string) => !url.includes('your-tunnel-name.trycloudflare.com');
export const API_BASE_URL = isCloudflareUrlSet(baseURL) ? baseURL : getDefaultApiUrl();

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: 30000,
  retryAttempts: 3,
  tokenRefreshBuffer: 2 * 60 * 1000,
} as const;

// Which backend is this build talking to? Until now the only way to find out was
// to attempt a sign-in and read the log the login path emits on its way through —
// so a dev pointed at the wrong API discovered it from a failed login rather than
// from the log. Say it once at startup instead, and say plainly when it is the
// live one, because every write from here is then real customer data.
if (__DEV__) {
  const live = /payrollapi\.niaga\.shop|api\.aipayroll\.com/.test(API_BASE_URL);
  console.log(
    `🌐 [API] ${API_BASE_URL}${live ? '  ⚠️ PRODUCTION — writes are live customer data' : ''}`,
  );
}
