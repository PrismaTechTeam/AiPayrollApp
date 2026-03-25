/**
 * Base URL + re-export of paths.
 * - Defines baseURL (env / fallback). start-tunnel.sh updates the fallback here.
 * - Imports ENDPOINTS from endpoints.ts and re-exports.
 * - config.ts imports baseURL from here and builds API_CONFIG.baseUrl.
 *
 * To use your Cloudflare backend:
 * 1. Set EXPO_PUBLIC_API_URL in .env (e.g. EXPO_PUBLIC_API_URL=https://your-tunnel.trycloudflare.com), or
 * 2. Run ./start-tunnel.sh from AiPayrollApp to auto-update the fallback in this file, or
 * 3. Set apiUrl in app.json → extra for EAS builds.
 */

import Constants from 'expo-constants';
import { ENDPOINTS } from './endpoints';

// Get environment variable, avoiding unresolved template placeholders like "${EXPO_PUBLIC_API_URL}"
const getEnvVar = (key: string, fallback: string): string => {
  const expoValue = Constants.expoConfig?.extra?.[key];
  const processValue = process.env[key];

  if (expoValue && typeof expoValue === 'string' && !expoValue.includes('${')) {
    return expoValue;
  }
  if (processValue && typeof processValue === 'string' && !processValue.includes('${')) {
    return processValue;
  }
  return fallback;
};

// ⚠️ Cloudflare: Run ./start-tunnel.sh to auto-replace the URL below (must stay on one line for sed)
const baseURL = getEnvVar('EXPO_PUBLIC_API_URL', 'https://productions-eden-shepherd-supplements.trycloudflare.com');
const baseWebSocketUrl = getEnvVar('EXPO_PUBLIC_WEBSOCKET_URL', 'https://productions-eden-shepherd-supplements.trycloudflare.com');

export { baseURL, baseWebSocketUrl, ENDPOINTS };

export const API_ENDPOINTS = ENDPOINTS;
