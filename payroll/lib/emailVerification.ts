/**
 * Email verification, required for accounts created from 2026-10-08.
 *
 * Until then nothing checked it: Register signed the new account straight in, so anyone could
 * type any address and be inside. The owner decided (2026-10-08) to require it from now on but
 * to leave existing accounts alone: on that day 15 of 17 password accounts in production were
 * active company members who had never verified, several of them HR, and gating them would
 * have locked them out overnight. The server applies the same date to the same rule.
 */
import type { User } from 'firebase/auth';

/** 2026-10-08 00:00 in Malaysia. Accounts created before this are never asked to verify. */
export const EMAIL_VERIFICATION_REQUIRED_FROM = Date.parse('2026-10-08T00:00:00+08:00');

/** Whether this Firebase user must verify their address before signing in. */
export function needsEmailVerification(user: Pick<User, 'emailVerified' | 'metadata'>): boolean {
  if (user.emailVerified) return false;
  const created = Date.parse(user.metadata.creationTime ?? '');
  // An unreadable creation time is treated as new: the safe side is asking for the link.
  return Number.isNaN(created) || created >= EMAIL_VERIFICATION_REQUIRED_FROM;
}

/**
 * Thrown by sign-in when the address is not verified yet. The Firebase session is kept, so the
 * verify page can resend the link and sign in once it is tapped.
 */
export class EmailNotVerifiedError extends Error {
  readonly code = 'app/email-not-verified';

  constructor(readonly email: string) {
    super('Please verify your email address first. We sent you a link.');
    this.name = 'EmailNotVerifiedError';
  }
}

export function isEmailNotVerified(err: unknown): err is EmailNotVerifiedError {
  return err instanceof EmailNotVerifiedError || (err as { code?: unknown } | null)?.code === 'app/email-not-verified';
}
