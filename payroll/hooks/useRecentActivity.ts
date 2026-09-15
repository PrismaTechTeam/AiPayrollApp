/**
 * The person's latest activity across requests, leaves, payslips and join
 * requests, merged and sorted newest first. Home shows nothing of it any more;
 * the Activity page shows all of it — one source so they never disagree.
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import requestService from '../api/services/requestService';
import leaveService from '../api/services/leaveService';
import payslipService from '../api/services/payslipService';
import companyService from '../api/services/companyService';
import type { IconName } from '../components/auth/PrimaryButton';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { annualEntitlement, shortLeaveName } from '../components/leave/LeaveUi';
import { parseServerDate } from '../lib/joinRequests';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface Activity {
  key: string;
  icon: IconName;
  tint: string;
  title: string;
  subtitle: string;
  status: string;
  at: number;
  screen: string;
}

function shortDate(iso: string | null | undefined): string {
  const d = parseServerDate(iso);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/**
 * The one leave balance the home tile quotes: annual leave, by name.
 *
 * Never a total. The tile used to add every entitled type together — annual,
 * sick, hospitalisation, compassionate, emergency — and announce "43 Days
 * Left", a number the employee cannot book any of and which mostly consists of
 * leave they hope never to take. `days` is what can actually be booked
 * (remaining minus pending), and `label` names whose days they are.
 */
export interface LeaveHeadline {
  days: number;
  /** Short form of the leave type's own name, e.g. "Annual". */
  label: string;
}

export interface ActivitySummary {
  items: Activity[];
  loading: boolean;
  pendingRequests: number | null;
  leaveHeadline: LeaveHeadline | null;
  latestPayslip: string | null;
}

export function useRecentActivity(owner: boolean, pageSize = 10): ActivitySummary {
  const [state, setState] = useState<ActivitySummary>({
    items: [],
    loading: true,
    pendingRequests: null,
    leaveHeadline: null,
    latestPayslip: null,
  });

  const load = useCallback(async () => {
    const [reqs, leaves, slips, joins, balance] = await Promise.allSettled([
      owner ? requestService.getAllRequests({ status: 'PENDING', pageSize }) : requestService.getApplications({ pageSize }),
      owner ? leaveService.getPendingApprovals({ pageSize }) : leaveService.getApplications({ pageSize }),
      owner ? Promise.resolve({ items: [], totalCount: 0 }) : payslipService.getList({ pageSize }),
      companyService.getJoinRequests(),
      // Entitlements, not getBalance(). That reads EmployeeLeaveBalances, a table the
      // policy engine never writes -- it showed 0 for anyone who had not already taken
      // leave, so this tile disagreed with the My Leaves screen it opens.
      owner ? Promise.resolve(null) : leaveService.getMyEntitlements(new Date().getFullYear()),
    ]);

    const items: Activity[] = [];
    let pendingRequests: number | null = null;
    let leaveHeadline: LeaveHeadline | null = null;
    let latestPayslip: string | null = null;

    if (reqs.status === 'fulfilled') {
      const list = reqs.value.items ?? [];
      const total = 'total' in reqs.value ? reqs.value.total : reqs.value.totalCount;
      pendingRequests = owner ? total : list.filter((r) => r.status === 'PENDING').length;
      list.forEach((r) =>
        items.push({
          key: `req-${r.id}`,
          icon: 'text-box-outline',
          tint: C.blue,
          title: 'Request',
          subtitle: `${r.requestType} · ${shortDate(r.createdAt)}`,
          status: r.status,
          at: parseServerDate(r.createdAt)?.getTime() ?? 0,
          screen: owner ? 'Requests' : 'MyRequests',
        }),
      );
    }

    if (leaves.status === 'fulfilled') {
      (leaves.value.items ?? []).forEach((l) =>
        items.push({
          key: `leave-${l.id}`,
          icon: 'calendar-clock-outline',
          tint: '#7C3AED',
          title: 'Leave Application',
          subtitle: `${l.leaveTypeDescription || l.leaveTypeCode} · ${shortDate(l.startDate)}`,
          status: l.status,
          at: parseServerDate(l.startDate)?.getTime() ?? 0,
          screen: owner ? 'Leaves' : 'MyLeaves',
        }),
      );
    }

    if (balance.status === 'fulfilled' && balance.value) {
      // One type, never a sum -- and its available figure, not its remaining one,
      // so the tile agrees with what the server will actually let them book.
      const headline = annualEntitlement(balance.value.items);
      leaveHeadline = headline
        ? { days: headline.availableDays ?? 0, label: shortLeaveName(headline) }
        : null;
    }

    if (slips.status === 'fulfilled') {
      const list = slips.value.items ?? [];
      if (list.length > 0) latestPayslip = MONTHS[list[0].payrollMonth - 1] ?? null;
      list.forEach((p) =>
        items.push({
          key: `slip-${p.payrollRunId}`,
          icon: 'file-document-outline',
          tint: '#F59E0B',
          title: 'Payslip',
          subtitle: `${MONTHS[p.payrollMonth - 1] ?? ''} ${p.payrollYear}`,
          status: 'AVAILABLE',
          at: parseServerDate(p.processedDate)?.getTime() ?? 0,
          screen: 'MyPayslip',
        }),
      );
    }

    if (joins.status === 'fulfilled') {
      joins.value.forEach((j) =>
        items.push({
          key: `join-${j.id}`,
          icon: 'email-outline',
          tint: '#0891B2',
          title: 'Join Request',
          subtitle: j.tenantName,
          status: j.status,
          at: parseServerDate(j.reviewedAt ?? j.createdAt)?.getTime() ?? 0,
          screen: 'MyJoinRequests',
        }),
      );
    }

    items.sort((a, b) => b.at - a.at);
    setState({ items, loading: false, pendingRequests, leaveHeadline, latestPayslip });
  }, [owner, pageSize]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return state;
}
