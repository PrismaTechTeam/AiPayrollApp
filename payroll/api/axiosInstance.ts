import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';
import { tokenManager } from './tokenManager';
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
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
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
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for the ongoing refresh to complete
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
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
      } catch {
        // Refresh failed - user needs to re-login
        await tokenManager.clearTokens();
        // The auth context will detect the cleared tokens and redirect to login
      }
    }

    return Promise.reject(error);
  }
);

async function refreshAccessToken(): Promise<string | null> {
  isRefreshing = true;
  try {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) return null;

    // Use a raw axios call to avoid interceptor loops
    const response = await axios.post(
      `${API_CONFIG.baseUrl}${ENDPOINTS.AUTH.REFRESH}`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { token, expiresIn } = response.data.content;
    await tokenManager.updateAccessToken(token, expiresIn);
    onTokenRefreshed(token);
    return token;
  } catch (error) {
    refreshSubscribers = [];
    throw error;
  } finally {
    isRefreshing = false;
  }
}

export default axiosInstance;
