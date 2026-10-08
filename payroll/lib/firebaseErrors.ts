/**
 * Firebase Auth reports failures as codes such as `auth/invalid-credential`.
 * Shown raw, that reads as a system fault when the person simply mistyped a
 * password — or, as happened during rollout, registered against a different
 * Firebase project than the one the app signs in to. This turns the code into
 * a sentence that says what to do next.
 *
 * Backend (axios) failures carry the server's own message when it wrote one for
 * people. The auth controllers do not always: their failures put a generic
 * label ("Internal Server Error", "Invalid Request", "Rate limit exceeded") in
 * `message` and the real sentence — or a raw exception — in `errors[0]`. Those
 * labels are skipped, a 429 uses the server's "try again in N seconds", and a
 * 5xx never shows the exception text it echoes. Transport failures (no network,
 * timeout) get their own wording because axios's "Network Error" explains nothing.
 */
type ServerBody = { message?: unknown; errors?: unknown; isSuccess?: unknown };
type AnyError = {
  code?: unknown;
  message?: unknown;
  response?: { status?: number; data?: ServerBody };
} | null | undefined;

// HR accounts are made on the web, and "create an account first" sent HR to
// Register, which answered that the email already exists. It is one login for
// both; someone who signs in on the web with Google has no password yet, and the
// reset link is what sets one.
const WRONG_LOGIN =
  'Email or password is incorrect. It is the same login as the SayangHR website. If you sign in there with Google, use Forgot password to set one.';
const BAD_CONFIG =
  "This build's sign-in configuration is invalid. Please update the app or contact support.";
const OFFLINE = 'Could not reach the sign-in service. Check your internet connection and try again.';
const TOO_MANY = 'Too many attempts. Please wait a minute and try again.';
const SERVER_TROUBLE = 'Something went wrong on our side. Please try again in a minute.';
const NOT_VERIFIED = 'We could not verify your sign-in. Please try again.';

/**
 * What a person sees when this build has no Firebase settings. The setup steps
 * for developers stay in the dev log; an employee can only update the app.
 */
export const SIGN_IN_UNAVAILABLE = 'Sign-in is not available in this version of the app. Please update the app.';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': WRONG_LOGIN,
  'auth/invalid-login-credentials': WRONG_LOGIN,
  'auth/user-not-found': WRONG_LOGIN,
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/invalid-email': 'That email address does not look right. Check it and try again.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/user-disabled': 'This account has been disabled. Contact your HR administrator.',
  'auth/too-many-requests':
    'Too many attempts. Wait a few minutes and try again, or reset your password.',
  'auth/network-request-failed': OFFLINE,
  'auth/email-already-in-use':
    'An account with this email already exists. Sign in instead, or reset your password.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/password-does-not-meet-requirements':
    'Password does not meet the requirements. Use a longer password with letters and numbers.',
  'auth/operation-not-allowed': 'Email sign-in is not enabled for this app. Contact support.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
  'auth/invalid-api-key': BAD_CONFIG,
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': BAD_CONFIG,
  'auth/app-not-authorized': BAD_CONFIG,
  'auth/unauthorized-domain': BAD_CONFIG,
};

/**
 * Labels the auth endpoints put in `message` that name a category rather than
 * say anything. Compared lower-case.
 */
const NOT_A_MESSAGE = new Set([
  'internal server error',
  'invalid request',
  'rate limit exceeded',
  'invalid firebase token',
  'login failed',
  'registration failed',
  'failed to sync user',
  'an error occurred',
  'bad request',
  'unauthorized',
  'forbidden',
]);

/** The text when it reads as a sentence for a person, otherwise null. */
function humanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  // "Invalid Firebase token: <exception>" is the SDK's own text behind a label.
  if (NOT_A_MESSAGE.has(lower) || lower.startsWith('invalid firebase token')) return null;
  return text;
}

/** The Firebase Auth error code on `err`, or '' when it is not a Firebase error. */
export function authErrorCode(err: unknown): string {
  const code = (err as AnyError)?.code;
  return typeof code === 'string' && code.startsWith('auth/') ? code : '';
}

/** HTTP status of a backend failure, or undefined when no response came back. */
export function responseStatus(err: unknown): number | undefined {
  const status = (err as AnyError)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

/** A loose "is this an email address" check for forms, before anything is sent. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function describeAuthError(err: unknown, fallback: string): string {
  const e = err as AnyError;
  const code = authErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code) return `${fallback} (${code})`;

  const status = responseStatus(err);
  const body = e?.response?.data;
  const message = humanText(body?.message);
  const firstError = Array.isArray(body?.errors) ? humanText(body.errors[0]) : null;

  // The rate limiter writes "Too many requests. Please try again in 37 seconds."
  // into errors[0]; that is the most useful thing it says.
  if (status === 429) return firstError ?? message ?? TOO_MANY;
  // A 5xx from these endpoints carries the exception text, never something to show.
  if (status !== undefined && status >= 500) return SERVER_TROUBLE;
  if (status === 401) return message ?? NOT_VERIFIED;
  // ResponseHelper.Fail(reason, title) on the web auth controllers: the title is in
  // `message` ("Verification Failed") and the reason in errors[0]. The same order
  // serverMessage uses, so a failure reads the same on every screen.
  if (body?.isSuccess === false && firstError) return firstError;
  if (message) return message;
  if (firstError) return firstError;
  if (status === 403) return 'You do not have access to do that.';

  const axiosCode = typeof e?.code === 'string' ? e.code : '';
  const raw = typeof e?.message === 'string' ? e.message : '';
  if (axiosCode === 'ERR_NETWORK' || raw === 'Network Error') return OFFLINE;
  if (axiosCode === 'ECONNABORTED' || /timeout/i.test(raw)) {
    return 'The server took too long to respond. Please try again.';
  }
  // A thrown Error from our own code already reads as a sentence; an axios
  // internal ("Request failed with status code 400") and the SDK's
  // "Firebase: Error (...)" do not.
  if (raw && !raw.startsWith('Firebase:') && !/^Request failed with status code/i.test(raw)) return raw;
  return fallback;
}
