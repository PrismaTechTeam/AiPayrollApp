/**
 * Shared bits for showing join requests: how each status looks, and how to
 * read the server's timestamps. Used by the home screen, the requests list and
 * the single-request page.
 */
import type { IconName } from '../components/auth/PrimaryButton';

export type JoinStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const STATUS_LOOK: Record<JoinStatus, { label: string; bg: string; fg: string; icon: IconName }> = {
  PENDING: { label: 'Pending', bg: '#FFF4E5', fg: '#B45309', icon: 'clock-outline' },
  APPROVED: { label: 'Approved', bg: '#DCFCE7', fg: '#15803D', icon: 'check' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', fg: '#B91C1C', icon: 'close' },
  CANCELLED: { label: 'Cancelled', bg: '#EEF2F7', fg: '#64748B', icon: 'minus' },
};

export function statusKey(status: string): JoinStatus {
  return (status in STATUS_LOOK ? status : 'CANCELLED') as JoinStatus;
}

/** Server timestamps are UTC but arrive without a zone marker; treat them as such. */
export function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * "8 Oct 2026, 2:38 pm" in Malaysia time. It used the phone's zone and no year,
 * so a phone set to another zone showed a different hour, and a request decided
 * last year read as this year.
 */
export function whenText(iso: string | null | undefined): string {
  const d = parseServerDate(iso);
  if (!d) return '';
  return d.toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** A copy of the list, newest request first. The server's order is not promised. */
export function newestFirst<T extends { createdAt: string }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => (parseServerDate(b.createdAt)?.getTime() ?? 0) - (parseServerDate(a.createdAt)?.getTime() ?? 0),
  );
}
