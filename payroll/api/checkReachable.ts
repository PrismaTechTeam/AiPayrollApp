/**
 * Test if the backend (e.g. via Cloudflare tunnel) is reachable from the app.
 * Use from a dev screen, login screen, or console to verify API connectivity.
 */
import { API_CONFIG } from './config';

export type ReachableResult =
  | { ok: true; status: number; baseUrl: string }
  | { ok: false; error: string; baseUrl: string };

/**
 * Tries to reach the backend. Any HTTP response (including 404) means the server
 * was reached; only network/timeout errors mean unreachable.
 */
export async function checkApiReachable(): Promise<ReachableResult> {
  const baseUrl = API_CONFIG.baseUrl.replace(/\/$/, '');
  // Swagger JSON is a good no-auth endpoint; 404 on base URL also proves reachability
  const url = `${baseUrl}/swagger/v1/swagger.json`;

  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10000) });
    return { ok: true, status: res.status, baseUrl };
  } catch {
    // Fallback: try base URL (e.g. returns 404) to confirm tunnel is up
    try {
      const res = await fetch(baseUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return { ok: true, status: res.status, baseUrl };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: message, baseUrl };
    }
  }
}
