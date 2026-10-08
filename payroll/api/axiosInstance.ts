import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';
import { tokenManager, tenantIdFromToken } from './tokenManager';
import { ENDPOINTS } from './endpoints';

/**
 * Configured Axios instance for all mobile API calls.
 * Features:
 * - Automatic Bearer token attachment
 * - Proactive token refresh (2 min before expiry)
 * - 401 response handling with token refresh retry
 * - Network error handling
 */

let isRefreshing = false;
// Requests that hit a 401 while a refresh was already running. Each is told the
// outcome: the new token, or null when the refresh produced none.
let refreshSubscribers: ((token: string | null) => void)[] = [];

/**
 * Settle every waiting request, then forget them. A failed refresh used to just
 * empty the list, which left each waiting request as a promise that never
 * settled, so its screen spun forever.
 */
function onTokenRefreshed(newToken: string | null) {
  const waiting = refreshSubscribers;
  refreshSubscribers = [];
  waiting.forEach(cb => cb(newToken));
}

function addRefreshSubscriber(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

/**
 * The server looked at the refresh token and refused it (expired, revoked by a
 * sign-out elsewhere, or malformed). Only then is the session really over. A
 * network error, a timeout, a 429 or a 5xx says nothing about the token.
 */
function refreshWasRefused(error: unknown): boolean {
  const status = (error as AxiosError | null)?.response?.status;
  return status === 400 || status === 401;
}

const axiosInstance = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token + proactive refresh
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth for public endpoints
    const publicPaths = [ENDPOINTS.AUTH.FIREBASE_LOGIN, ENDPOINTS.AUTH.FIREBASE_SIGNUP, ENDPOINTS.AUTH.REGISTER, ENDPOINTS.AUTH.REFRESH, ENDPOINTS.AUTH.FORGOT_PASSWORD];
    const isPublic = publicPaths.some(path => config.url?.includes(path));

    if (isPublic) return config;

    // Check if token needs proactive refresh
    const expired = await tokenManager.isTokenExpired(API_CONFIG.tokenRefreshBuffer);
    if (expired && !isRefreshing) {
      try {
        await refreshAccessToken();
      } catch {
        // If refresh fails, continue with current token - 401 handler will catch it
      }
    }

    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 with token refresh
// A 401 normally means the access token expired. A few calls answer 401 to say
// "wrong code" (two-factor verify), and refreshing — or signing the person out —
// on that would be wrong; those calls set this flag.
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.skipAuthRefresh) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for the ongoing refresh. If it produces no token this request
        // fails with its own 401, like the one that started the refresh.
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken: string | null) => {
            if (!newToken) {
              reject(error);
              return;
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Clearing the tokens signs the person out: PayrollAuthContext listens
        // through tokenManager.onCleared and returns to the login page. So only a
        // refusal does it; a blip (offline, timeout, 429, 5xx) keeps the session
        // and the next request tries the refresh again.
        if (refreshWasRefused(refreshError)) {
          await tokenManager.clearTokens();
        }
      }
    }

    return Promise.reject(error);
  }
);

async function refreshAccessToken(): Promise<string | null> {
  isRefreshing = true;
  try {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) {
      onTokenRefreshed(null);
      return null;
    }

    // The company the app is showing. A refresh that does not name it gets a token for
    // whichever company the account last chose anywhere (the web, another phone), and a
    // multi-company HR kept seeing company A while every call ran in company B. The reworked
    // server honours tenantId; the live one ignores the field, so the switch below covers it.
    const oldClaim = await tokenManager.getTenantClaim();

    // Use a raw axios call to avoid interceptor loops
    const response = await axios.post(
      `${API_CONFIG.baseUrl}${ENDPOINTS.AUTH.REFRESH}`,
      { refreshToken, tenantId: oldClaim ?? undefined },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // The server rotates the refresh token on every refresh. Keeping only the
    // original one signed people out 30 days after they last typed a password,
    // however often they opened the app.
    const { token, expiresIn, refreshToken: rotated } = response.data.content;
    let finalToken: string = token;
    let finalExpiresIn: number | undefined = expiresIn;

    // The live server answered for another company: move the new token back to the one on
    // screen, the same call the company switcher makes, before anything else runs with it.
    const issuedFor = tenantIdFromToken(token);
    if (oldClaim && issuedFor && issuedFor.toLowerCase() !== oldClaim.toLowerCase()) {
      try {
        const switched = await axios.post(
          `${API_CONFIG.baseUrl}${ENDPOINTS.AUTH.SWITCH_TENANT}`,
          { tenantId: oldClaim },
          { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
        );
        const content = switched.data?.content;
        if (typeof content?.token === 'string' && content.token) {
          finalToken = content.token;
          finalExpiresIn = typeof content.expiresIn === 'number' ? content.expiresIn : expiresIn;
        }
      } catch {
        // Removed from that company, or offline: keep the refreshed token. A working session
        // in the other company is no worse than before this check existed, and the company
        // switcher still moves it by hand.
      }
    }

    await tokenManager.updateAccessToken(finalToken, finalExpiresIn, rotated);
    onTokenRefreshed(finalToken);
    return finalToken;
  } catch (error) {
    onTokenRefreshed(null);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

export default axiosInstance;
