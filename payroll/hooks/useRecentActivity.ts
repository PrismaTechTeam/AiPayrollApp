/**
 * The person's own latest activity in this company -- requests, leave, claims and payslips --
 * merged and sorted newest first, for the Activity page.
 *
 * Always their OWN history, HR included. It used to switch to other employees' pending requests
 * for HR, untitled and unnamed, under a heading that said "Requests, leaves, payslips": not their
 * activity, and a second, different copy of the approval queues that have their own screens.
 *
 * Loading, failed and empty are kept apart. Every source failing used to look exactly like a
 * person with nothing yet, which is the one thing an outage must not look like.
 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import requestService from '../api/services/requestService';
import leaveService from '../api/services/leaveService';
import payslipService from '../api/services/payslipService';
import claimService from '../api/services/claimService';
import type { IconName } from '../components/auth/PrimaryButton';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { dateRangeText } from '../components/leave/LeaveUi';
import { shortDate as mytShortDate } from '../components/requests/RequestUi';
import { money } from '../components/claims/ClaimUi';
import { parseServerDate } from '../lib/joinRequests';
import { serverMessage } from '../lib/serverMessage';
import type { RootStackParamList } from '../navigation/types';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Where a row goes when tapped: the item itself, not the list it came from. */
export type ActivityLink =
  | { screen: 'RequestDetails'; params: RootStackParamList['RequestDetails'] }
  | { screen: 'LeaveDetails'; params: RootStackParamList['LeaveDetails'] }
  | { screen: 'ClaimDetails'; params: RootStackParamList['ClaimDetails'] }
  | { screen: 'PayslipDetails'; params: RootStackParamList['PayslipDetails'] };

export interface Activity {
  key: string;
  icon: IconName;
  tint: string;
  /** What it is: the request type, the leave type, the claim type, the payslip's month. */
  title: string;
  /** Which kind of thing, and when. */
  subtitle: string;
  /** The server's status word, e.g. PENDING, DRAFT, WITHDRAWN; AVAILABLE for a payslip. */
  status: string;
  at: number;
  link: ActivityLink;
}

export type ActivityLoad =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  /** `partial`: at least one source failed, so rows may be missing. */
  | { kind: 'ready'; items: Activity[]; partial: boolean };

/**
 * "8 Oct 2026" in Malaysia time, the way every other screen writes a date. It followed the
 * phone's locale, so a phone set to English (US) or German read "Oct 8, 2026" here and
 * "8 Oct 2026" on the page the row opens. Empty rather than a dash, so joined() drops it.
 */
function shortDate(iso: string | null | undefined): string {
  return iso && parseServerDate(iso) ? mytShortDate(iso) : '';
}

function joined(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => !!p).join(' · ');
}

export function useRecentActivity(linked: boolean, pageSize = 10): { load: ActivityLoad; reload: () => Promise<void> } {
  const [load, setLoad] = useState<ActivityLoad>({ kind: 'loading' });
  // Each run gets a number; an answer from an older run is dropped, so leaving and coming back
  // quickly can never let the slower, older answer overwrite the newer one.
  const runs = useRef(0);

  const reload = useCallback(async () => {
    const run = ++runs.current;
    if (!linked) {
      // No employee record in this company: there is no own history to show.
      setLoad({ kind: 'ready', items: [], partial: false });
      return;
    }

    const [reqs, leaves, claims, slips] = await Promise.allSettled([
      requestService.getApplications({ page: 1, pageSize }),
      leaveService.getApplications({ page: 1, pageSize }),
      claimService.getApplications({ page: 1, pageSize }),
      payslipService.getList({ page: 1, pageSize }),
    ]);
    if (runs.current !== run) return;

    try {
      setLoad(merge(reqs, leaves, claims, slips));
    } catch (err) {
      // A row in a shape nobody expected must end in a message, never in a spinner that turns
      // forever because the rejection had nowhere to go.
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not read your activity.') });
    }
  }, [linked, pageSize]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      // Leaving the page invalidates whatever is still in flight.
      return () => {
        runs.current += 1;
      };
    }, [reload]),
  );

  return { load, reload };
}


type Settled<T> = PromiseSettledResult<T>;

/** The four answers as one list, newest first, or the reason there is none. */
function merge(
  reqs: Settled<Awaited<ReturnType<typeof requestService.getApplications>>>,
  leaves: Settled<Awaited<ReturnType<typeof leaveService.getApplications>>>,
  claims: Settled<Awaited<ReturnType<typeof claimService.getApplications>>>,
  slips: Settled<Awaited<ReturnType<typeof payslipService.getList>>>,
): ActivityLoad {
  const results = [reqs, leaves, claims, slips];
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length === results.length) {
    return { kind: 'failed', message: serverMessage(failures[0].reason, 'Check your connection, then try again.') };
  }

  const items: Activity[] = [];

  if (reqs.status === 'fulfilled') {
    (reqs.value?.items ?? []).forEach((r) =>
      items.push({
        key: `req-${r.id}`,
        icon: 'text-box-outline',
        tint: C.blue,
        // The mobile list sends the type's name in requestType; the code is never shown.
        title: r.requestTypeName || r.requestType || 'Request',
        subtitle: joined('Request', shortDate(r.createdAt)),
        status: r.status,
        at: parseServerDate(r.createdAt)?.getTime() ?? 0,
        link: { screen: 'RequestDetails', params: { requestId: r.id } },
      }),
    );
  }

  if (leaves.status === 'fulfilled') {
    (leaves.value?.items ?? []).forEach((l) =>
      items.push({
        key: `leave-${l.id}`,
        icon: 'calendar-clock-outline',
        tint: '#7C3AED',
        title: l.leaveTypeDescription || l.leaveTypeCode || 'Leave',
        // The dates taken, read as plain dates: "2026-12-20" is not a timestamp, and parsing it
        // as one blanked the date on Android.
        subtitle: joined('Leave', dateRangeText(l.startDate, l.endDate)),
        status: l.status,
        // Sorted by when it was applied for, not when it starts: a December holiday booked today
        // is today's activity, not something from the future that sits above everything else.
        at: parseServerDate(l.createdAt)?.getTime() ?? 0,
        link: { screen: 'LeaveDetails', params: { leaveId: l.id } },
      }),
    );
  }

  if (claims.status === 'fulfilled') {
    (claims.value?.items ?? []).forEach((c) =>
      items.push({
        key: `claim-${c.id}`,
        icon: 'receipt-text-outline',
        tint: '#0EA5E9',
        title: c.claimTypeName || 'Claim',
        subtitle: joined('Claim', money(c.amount), shortDate(c.createdAt)),
        status: c.status,
        at: parseServerDate(c.createdAt)?.getTime() ?? 0,
        link: { screen: 'ClaimDetails', params: { claimId: c.id } },
      }),
    );
  }

  if (slips.status === 'fulfilled') {
    (slips.value?.items ?? []).forEach((p) =>
      items.push({
        key: `slip-${p.payrollRunId}`,
        icon: 'wallet-outline',
        tint: '#D97706',
        title: `${MONTHS[p.payrollMonth - 1] ?? ''} ${p.payrollYear}`.trim(),
        subtitle: joined('Payslip', shortDate(p.processedDate)),
        status: 'AVAILABLE',
        at: parseServerDate(p.processedDate)?.getTime() ?? 0,
        // The row goes along, as from My Payslip, so the payslip page can name a bonus or a
        // weekly run; the document itself carries only the month.
        link: { screen: 'PayslipDetails', params: { payrollRunId: p.payrollRunId, payslip: p } },
      }),
    );
  }

  items.sort((a, b) => b.at - a.at);
  return { kind: 'ready', items, partial: failures.length > 0 };
}
