/**
 * Firebase Auth reports failures as codes such as `auth/invalid-credential`.
 * Shown raw, that reads as a system fault when the person simply mistyped a
 * password — or, as happened during rollout, registered against a different
 * Firebase project than the one the app signs in to. This turns the code into
 * a sentence that says what to do next.
 *
 * Backend (axios) failures carry the server's own message, which is already
 * written for people; that is passed through untouched. Transport failures
 * (no network, timeout) get their own wording because axios's "Network Error"
 * explains nothing.
 */
type ServerBody = { message?: unknown; errors?: unknown };
type AnyError = {
  code?: unknown;
  message?: unknown;
  response?: { status?: number; data?: ServerBody };
} | null | undefined;

const WRONG_LOGIN =
  'Email or password is incorrect. If you have not registered on this app yet, create an account first.';
const BAD_CONFIG =
  "This build's sign-in configuration is invalid. Please update the app or contact support.";
const OFFLINE = 'Could not reach the sign-in service. Check your internet connection and try again.';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': WRONG_LOGIN,
  'auth/invalid-login-credentials': WRONG_LOGIN,
  'auth/user-not-found': 'No account found for this email. Create an account first.',
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

export function describeAuthError(err: unknown, fallback: string): string {
  const e = err as AnyError;
  const code = authErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code) return `${fallback} (${code})`;

  const body = e?.response?.data;
  if (typeof body?.message === 'string' && body.message) return body.message;
  if (Array.isArray(body?.errors) && typeof body.errors[0] === 'string' && body.errors[0]) {
    return body.errors[0];
  }

  const axiosCode = typeof e?.code === 'string' ? e.code : '';
  const message = typeof e?.message === 'string' ? e.message : '';
  if (axiosCode === 'ERR_NETWORK' || message === 'Network Error') return OFFLINE;
  if (axiosCode === 'ECONNABORTED' || /timeout/i.test(message)) {
    return 'The server took too long to respond. Please try again.';
  }
  if (message && !message.startsWith('Firebase:')) return message;
  return fallback;
}
