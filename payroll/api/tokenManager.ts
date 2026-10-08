import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'payroll_access_token';
const REFRESH_TOKEN_KEY = 'payroll_refresh_token';
const TOKEN_EXPIRY_KEY = 'payroll_token_expiry';

type ClearedListener = () => void;

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** base64url -> binary string. Small enough to own rather than depend on a global atob. */
function decodeBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const ch of b64) {
    const value = BASE64.indexOf(ch);
    if (value < 0) continue; // padding
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
}

/**
 * The TenantId claim the server put in an access token, or null.
 *
 * Lives here rather than in the auth context so the token refresh can read it
 * too: a refresh that does not say which company it is for gets a token for
 * whichever company the account last chose anywhere (the web, another phone),
 * and the app went on showing company A while every call ran in company B.
 */
export function tenantIdFromToken(token: string | null | undefined): string | null {
  try {
    const payload = token?.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
    const id = claims.TenantId;
    return typeof id === 'string' && id ? id : null;
  } catch {
    return null;
  }
}

/**
 * Manages JWT tokens using expo-secure-store.
 * Access token is also kept in memory for fast access.
 */
class TokenManager {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private clearedListeners = new Set<ClearedListener>();

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

  /** The company the stored access token is for, or null (none chosen, or no token). */
  async getTenantClaim(): Promise<string | null> {
    return tenantIdFromToken(await this.getAccessToken());
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

  /**
   * Called after every clearTokens(). axiosInstance clears the tokens when a
   * refresh is refused, and nothing used to notice: the app stayed "signed in"
   * with no token, every screen failed, and there was no way back to the login
   * page. The auth context subscribes here and signs the person out.
   * Returns the unsubscribe function.
   */
  onCleared(listener: ClearedListener): () => void {
    this.clearedListeners.add(listener);
    return () => {
      this.clearedListeners.delete(listener);
    };
  }

  /** Clear all tokens (logout) */
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = null;

    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
    } finally {
      // Even when the store write fails the in-memory token is gone, so the
      // session is over either way and listeners must hear about it.
      this.clearedListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // One listener failing must not stop the others.
        }
      });
    }
  }

  /**
   * Update the access token after a refresh or a company switch.
   *
   * `refreshToken` is optional because a switch does not return one. A refresh
   * does, and it used to be dropped: the original refresh token was kept until
   * its 30-day expiry, so even someone who opened the app every day was signed
   * out a month after they last typed their password.
   */
  async updateAccessToken(accessToken: string, expiresIn?: number, refreshToken?: string): Promise<void> {
    this.accessToken = accessToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

    if (expiresIn) {
      this.tokenExpiry = Date.now() + expiresIn * 1000;
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());
    }

    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  }
}

export const tokenManager = new TokenManager();
