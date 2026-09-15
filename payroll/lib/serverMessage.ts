/**
 * The server's own words for a failure, when it has any.
 *
 * The API answers a rejected upload with a sentence written for the person
 * ("That file is not a valid PDF"). Swallowing it and showing a generic
 * "something went wrong" leaves them with no idea what to fix, so the server's
 * message wins whenever there is one.
 */
type ApiError = {
  response?: { status?: number; data?: { message?: unknown; errors?: unknown } };
  message?: unknown;
  code?: unknown;
} | null | undefined;

export function serverMessage(err: unknown, fallback: string): string {
  const e = err as ApiError;

  const body = e?.response?.data;
  if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  if (Array.isArray(body?.errors) && typeof body.errors[0] === 'string' && body.errors[0]) {
    return body.errors[0];
  }

  const status = e?.response?.status;
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
