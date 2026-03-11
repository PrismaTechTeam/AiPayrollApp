import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'payroll_access_token';
const REFRESH_TOKEN_KEY = 'payroll_refresh_token';
const TOKEN_EXPIRY_KEY = 'payroll_token_expiry';

/**
 * Manages JWT tokens using expo-secure-store.
 * Access token is also kept in memory for fast access.
 */
class TokenManager {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  /** Store both access and refresh tokens */
  async setTokens(accessToken: string, refreshToken: string, expiresIn?: number): Promise<void> {
    this.accessToken = accessToken;

    if (expiresIn) {
      this.tokenExpiry = Date.now() + expiresIn * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }

  /** Get the current access token (from memory first, then SecureStore) */
  async getAccessToken(): Promise<string | null> {
    if (this.accessToken) return this.accessToken;

    const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (stored) this.accessToken = stored;
    return stored;
  }

  /** Get the refresh token */
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  /** Check if the access token is expired or about to expire */
  async isTokenExpired(bufferMs: number = 120000): Promise<boolean> {
    if (!this.tokenExpiry) {
      const stored = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      this.tokenExpiry = stored ? parseInt(stored, 10) : null;
    }

    if (!this.tokenExpiry) return true; // No expiry info = treat as expired
    return Date.now() >= this.tokenExpiry - bufferMs;
  }

  /** Clear all tokens (logout) */
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = null;

    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
  }

  /** Update only the access token (after refresh) */
  async updateAccessToken(accessToken: string, expiresIn?: number): Promise<void> {
    this.accessToken = accessToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

    if (expiresIn) {
      this.tokenExpiry = Date.now() + expiresIn * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());
    }
  }
}

export const tokenManager = new TokenManager();
