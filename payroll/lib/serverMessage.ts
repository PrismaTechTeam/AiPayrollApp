/**
 * The server's own words for a failure, when it has any.
 *
 * The API answers a rejected upload with a sentence written for the person
 * ("That file is not a valid PDF"). Swallowing it and showing a generic
 * "something went wrong" leaves them with no idea what to fix, so the server's
 * message wins whenever there is one.
 *
 * Three exceptions, in this order:
 * - A 5xx carries an exception's text, never a sentence for a person, so it
 *   gets the caller's fallback.
 * - A rights refusal from the [HasRight] filter says "Access denied. Required
 *   permission: REQUEST_TYPE.EDIT", an internal code that tells the person
 *   nothing about what to do next. Other 403s keep the server's words: "You
 *   cannot approve or reject your own request." is exactly what to read.
 * - The web controllers answer ResponseHelper.Fail(reason, title): `message` is
 *   a heading ("Verification Failed") and `errors[0]` the reason. The mobile
 *   controllers send no errors, so for them `message` still wins.
 */
type ApiError = {
  response?: {
    status?: number;
    data?: { message?: unknown; errors?: unknown; isSuccess?: unknown; requiredRight?: unknown };
  };
  message?: unknown;
  code?: unknown;
} | null | undefined;

export function serverMessage(err: unknown, fallback: string): string {
  const e = err as ApiError;
  const status = e?.response?.status;
  const body = e?.response?.data;

  if (typeof status === 'number' && status >= 500) return fallback;
  if (status === 403 && body?.requiredRight) {
    return 'Your role does not allow this. Ask your administrator for access.';
  }

  const first: unknown = Array.isArray(body?.errors) ? body.errors[0] : undefined;
  const firstError = typeof first === 'string' && first.trim() ? first : null;
  if (body?.isSuccess === false && firstError) return firstError;
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (firstError) return firstError;

  if (status === 401) return 'Your session has ended. Sign in again to continue.';
  if (status === 403) return 'You do not have access to do that.';
  if (status === 413) return 'That file is too large to upload.';

  const code = typeof e?.code === 'string' ? e.code : '';
  const message = typeof e?.message === 'string' ? e.message : '';
  if (code === 'ERR_NETWORK' || message === 'Network Error') {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (code === 'ECONNABORTED' || /timeout/i.test(message)) {
    return 'The server took too long to respond. Please try again.';
  }

  // A thrown Error from our own code already reads as a sentence; an axios
  // internal ("Request failed with status code 500") does not.
  if (message && !/^Request failed with status code/i.test(message)) return message;
  return fallback;
}

export function statusOfError(err: unknown): number | undefined {
  const status = (err as ApiError)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}
