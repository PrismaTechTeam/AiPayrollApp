/**
 * Company Home
 * The first screen inside a company: a compact header (company, bell, one-line greeting), then
 * what this person has to do here.
 *
 * What it shows follows two separate facts, never a role name:
 *  - an employee record in this company  -> "My work": requests, leave, payslip, documents,
 *    claims, attendance (and Punch in the bottom bar);
 *  - approval rights from the server     -> "To decide": one row per right with its count, the
 *    newest items "Waiting for you", and, with an attendance right, the team today.
 * HR who are also employees get both. An HR account with no employee record (a company owner,
 * often) used to get three small tiles and half a screen of nothing: it could not see who was
 * waiting, for what, or for how long without opening each list.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomNavBar, useBottomNavSpace } from '../components/BottomNavBar';
import { CompanySwitcher } from '../components/CompanySwitcher';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { useDepartmentApprover } from '../hooks/useDepartmentApprover';
import { useTeamTodayOpen } from '../hooks/useTeamTodayOpen';
import leaveService, { type LeaveApplication } from '../api/services/leaveService';
import requestService, { type WaitingRequest } from '../api/services/requestService';
import claimService, { type ClaimApplication } from '../api/services/claimService';
import payslipService from '../api/services/payslipService';
import documentService from '../api/services/documentService';
import attendanceService, { type TodayAttendance } from '../api/services/attendanceService';
import notificationService from '../api/services/notificationService';
import dashboardService, { type TeamSnapshot } from '../api/services/dashboardService';
import { AUTH_COLORS as C, SERVICE_TILE } from '../components/auth/AuthBackdrop';
import { APPROVAL_AVATAR_BG } from '../components/ui/ApprovalCard';
import type { IconName } from '../components/auth/PrimaryButton';
import { Busy, DocumentState } from '../components/documents/DocumentUi';
import { annualEntitlement, dateRangeText, dayNumber, goTo, leaveLength, shortLeaveName } from '../components/leave/LeaveUi';
import { dayMonth, initials, waitingDays } from '../components/requests/RequestUi';
import { money } from '../components/claims/ClaimUi';
import { clockText } from '../components/attendance/PunchRequestUi';
import { parseServerDate } from '../lib/joinRequests';
import type { RootStackParamList } from '../navigation/types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

const PAD = 16;
const GAP = 10;
/**
 * The wash behind every icon, the same as All services' (SERVICE_TILE), so a service looks the
 * same on both pages. Blue itself is kept for buttons and the active tab.
 */
const ICON_WASH = SERVICE_TILE.bg;
const ICON_TINT = SERVICE_TILE.tint;
const SKELETON = '#EEF2F7';
/** The amber of a Pending pill: there is something for the reader to do. */
const ATTENTION = '#B45309';

/** The clock in Malaysia: the payroll's day, whatever zone the phone is set to. */
function mytNow(): Date {
  return new Date(Date.now() + MYT_OFFSET_MS);
}

function getGreeting(): string {
  const hour = mytNow().getUTCHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * "Thursday 8 October". Written out rather than toLocaleDateString, which follows the phone:
 * an Android phone set to English (US) printed "Thursday, October 8" against "8 Oct" everywhere else.
 */
function todayText(): string {
  const t = mytNow();
  return `${WEEKDAYS[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`;
}

/**
 * Today's punches, as the attendance tile says them. The last punch decides it:
 * IN and BREAK_IN mean the person is at work now, OUT and BREAK_OUT that they left.
 */
function punchNote(today: TodayAttendance): string {
  const punches = [...today.punches].sort(
    (a, b) => (parseServerDate(a.punchTime)?.getTime() ?? 0) - (parseServerDate(b.punchTime)?.getTime() ?? 0),
  );
  const last = punches[punches.length - 1];
  if (!last) return 'Not punched in';
  const at = parseServerDate(last.punchTime);
  // The same "8:05 AM" Punch and Punch Requests show, whatever the phone's locale.
  const time = at ? clockText(at.getHours(), at.getMinutes()) : '';
  const isIn = last.punchType === 'IN' || last.punchType === 'BREAK_IN';
  return isIn ? `In since ${time}` : `Out at ${time}`;
}

/** The total a page reports, read defensively: an answer without one counts as none. */
function totalOf(page: unknown): number {
  const p = page as { total?: unknown } | null | undefined;
  return typeof p?.total === 'number' ? p.total : 0;
}

function joined(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => !!p).join(' · ');
}

// ── My work ───────────────────────────────────────────────────────────

/** Null is "not known yet, or the call failed": the tile then shows no note rather than a wrong one. */
interface MyNumbers {
  requests: number | null;
  claims: number | null;
  docs: number | null;
  leave: { days: number; label: string } | null;
  payslip: string | null;
  punch: string | null;
}

const NO_NUMBERS: MyNumbers = { requests: null, claims: null, docs: null, leave: null, payslip: null, punch: null };

/** "partial": at least one figure could not be read, so a blank note means "unknown", not "none". */
type LoadState = 'loading' | 'done' | 'partial';

/** "3 pending" on the employee's own items, which wait on somebody else: never amber. */
function pendingNote(n: number | null): string {
  if (n === null) return '';
  return n > 0 ? `${n} pending` : 'None pending';
}

interface Tile {
  key: string;
  /** On the roomy two-column grid. */
  title: string;
  /** On the three-column grid, where the section heading already says whose it is. */
  short: string;
  note: string;
  /** Something is waiting for the reader: the note turns amber, like a Pending pill. */
  attention?: boolean;
  icon: IconName;
  screen: keyof RootStackParamList;
}

// ── To decide ─────────────────────────────────────────────────────────

/** Loading (null), failed, or the number: three different things, shown three different ways. */
type Count = number | null | 'failed';
type QueueKey = 'leave' | 'requests' | 'claims' | 'dept' | 'punch';

/** One item waiting for this approver, whatever kind it is, in the shape a Home row needs. */
interface Waiting {
  key: string;
  kind: 'leave' | 'request' | 'claim';
  id: string;
  name: string;
  code: string | null;
  icon: IconName;
  /** "Annual Leave · 14 – 15 Sep 2026 · 2 days", "Mileage · RM 120.00", "Salary letter". */
  what: string;
  createdAt: string;
}

interface Queue {
  count: Count;
  /** The newest few, for the Waiting list. */
  items: Waiting[];
}

const LOADING: Queue = { count: null, items: [] };
const FAILED: Queue = { count: 'failed', items: [] };
const NO_QUEUES: Record<QueueKey, Queue> = { leave: LOADING, requests: LOADING, claims: LOADING, dept: LOADING, punch: LOADING };

interface DecideRow {
  key: QueueKey;
  label: string;
  icon: IconName;
  screen: keyof RootStackParamList;
}

function fromLeave(l: LeaveApplication): Waiting {
  return {
    key: `leave-${l.id}`,
    kind: 'leave',
    id: l.id,
    name: l.employeeName || 'Employee',
    code: l.employeeCode || null,
    icon: 'calendar-blank-outline',
    what: joined(l.leaveTypeDescription || 'Leave', dateRangeText(l.startDate, l.endDate), leaveLength(l)),
    createdAt: l.createdAt,
  };
}

function fromRequest(r: WaitingRequest): Waiting {
  return {
    key: `request-${r.id}`,
    kind: 'request',
    id: r.id,
    name: r.employeeName || 'Employee',
    code: r.employeeCode || null,
    icon: 'text-box-outline',
    what: r.requestType || 'Request',
    createdAt: r.createdAt,
  };
}

function fromClaim(c: ClaimApplication): Waiting {
  return {
    key: `claim-${c.id}`,
    kind: 'claim',
    id: c.id,
    name: c.employeeName || 'Employee',
    code: c.employeeCode || null,
    icon: 'receipt-text-outline',
    what: joined(c.claimTypeName || 'Claim', money(c.amount)),
    createdAt: c.createdAt,
  };
}

/** "Applied 4 Sep · waiting 34 days"; "Applied today" rather than "waiting 0 days". */
function appliedText(iso: string): string {
  const days = waitingDays(iso);
  if (days === null) return '';
  if (days === 0) return 'Applied today';
  return `Applied ${dayMonth(iso)} · waiting ${days} ${days === 1 ? 'day' : 'days'}`;
}

/** Every queue's newest items as one list, newest first. */
function mergeWaiting(queues: Queue[], size: number): Waiting[] {
  const byKey = new Map<string, Waiting>();
  queues.forEach((q) => q.items.forEach((w) => byKey.set(w.key, w)));
  const time = (w: Waiting) => parseServerDate(w.createdAt)?.getTime() ?? 0;
  return [...byKey.values()].sort((a, b) => time(b) - time(a)).slice(0, size);
}

type TeamState = TeamSnapshot | null | 'loading' | 'failed';

export const PayrollHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = usePayrollAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const access = useApproverAccess();
  const dept = useDepartmentApprover();
  const refreshAccess = access.refresh;
  const refreshDept = dept.refresh;

  const tenantId = user?.tenantId ?? null;
  // An employee record in this company. HR may have one or not; an employee always does.
  const ownEmployeeId = user?.employeeId ?? null;
  const linked = !!ownEmployeeId;
  const canApproveRequests = access.ready && access.requests;
  const canApproveLeave = access.ready && access.leave;
  const canApproveClaims = access.ready && access.claims;
  // A department approver without the company-wide leave right gets one row for the leave
  // waiting on them. With the right, the Leave row already covers it.
  const deptApprover = dept.isDepartmentApprover && !canApproveLeave;
  const canSeeTeam = access.ready && access.team;
  // Team Today itself (the list behind the card) also needs the server to let this person in.
  const teamOpen = useTeamTodayOpen();
  // Everyone's forgotten-punch requests (ATTENDANCE_WORK_CARD.VIEW). Counted here so the queue
  // HR works through on the web is seen from the phone; the list opens read-only.
  const canSeePunches = access.ready && access.punchApprovals;
  // Somebody who is also an employee has My work under the list, so the list is one row shorter.
  const listSize = linked ? 3 : 4;

  const navSpace = useBottomNavSpace(linked);

  const [unread, setUnread] = useState(0);
  const [mine, setMine] = useState<MyNumbers>(NO_NUMBERS);
  const [mineLoad, setMineLoad] = useState<LoadState>('loading');
  const [queues, setQueues] = useState<Record<QueueKey, Queue>>(NO_QUEUES);
  const [team, setTeam] = useState<TeamState>('loading');
  const [refreshing, setRefreshing] = useState(false);

  // Another company's numbers must never sit on this company's rows, not even while the new
  // ones load. The switcher is a modal, so Home does not lose focus when it is used; the loaders
  // below depend on the company for the same reason, which re-runs them.
  useEffect(() => {
    setMine(NO_NUMBERS);
    setMineLoad('loading');
    setQueues(NO_QUEUES);
    setTeam('loading');
  }, [tenantId]);

  // Each load gets a number; an answer that arrives after a newer load started is dropped, so a
  // slow reply from the previous company cannot overwrite the current one.
  const mineRun = useRef(0);
  const approvalsRun = useRef(0);
  const teamRun = useRef(0);

  const loadMine = useCallback(async () => {
    const run = ++mineRun.current;
    if (!tenantId) return;
    const put = (patch: Partial<MyNumbers>) => {
      if (mineRun.current === run) setMine((m) => ({ ...m, ...patch }));
    };
    // The unread count only drives the bell's dot; its failure is not a figure gone missing.
    void notificationService
      .getUnreadCount()
      .then((n) => {
        if (mineRun.current === run) setUnread(n);
      })
      .catch(() => undefined);
    if (!linked) {
      setMineLoad('done');
      return;
    }
    const results = await Promise.allSettled([
      // Counted on the server: the newest five rows said "0 Pending" whenever the pending
      // ones were older than the last five decided ones.
      requestService.getApplications({ status: 'PENDING', page: 1, pageSize: 1 }).then((p) => put({ requests: totalOf(p) })),
      claimService.getApplications({ status: 'PENDING', page: 1, pageSize: 1 }).then((p) => put({ claims: p.total })),
      // This count IS the notification for documents: there is no push for them,
      // so if the tile does not say there is something to do, nothing does.
      documentService.getActionNeeded().then((n) => put({ docs: n })),
      // Entitlements, not getBalance(). That reads EmployeeLeaveBalances, a table the
      // policy engine never writes -- it showed 0 for anyone who had not already taken
      // leave, so this tile disagreed with the My Leaves screen it opens. One type, never a
      // sum, and its available figure, so it agrees with what the server will let them book.
      leaveService.getMyEntitlements(mytNow().getUTCFullYear()).then((e) => {
        const annual = annualEntitlement(e.items ?? []);
        put({ leave: annual ? { days: annual.availableDays ?? 0, label: shortLeaveName(annual) } : null });
      }),
      payslipService.getList({ page: 1, pageSize: 1 }).then((p) => {
        const latest = (p?.items ?? [])[0];
        put({ payslip: latest ? MONTHS[latest.payrollMonth - 1] ?? 'Latest' : 'None yet' });
      }),
      attendanceService.getToday().then((t) => put({ punch: punchNote(t) })),
    ]);
    if (mineRun.current === run) setMineLoad(results.some((r) => r.status === 'rejected') ? 'partial' : 'done');
  }, [linked, tenantId]);

  // One page per queue, a few rows long: its total is the row's count and its items are the
  // Waiting list, so the list costs no request beyond the counts Home always read.
  const loadApprovals = useCallback(async () => {
    const run = ++approvalsRun.current;
    if (!tenantId) return;
    const put = (key: QueueKey, queue: Queue) => {
      if (approvalsRun.current === run) setQueues((all) => ({ ...all, [key]: queue }));
    };
    // A failure is said as one, never left blank where it reads as "nothing to do".
    const job = (key: QueueKey, read: () => Promise<Queue>) => read().then((q) => put(key, q), () => put(key, FAILED));
    const notMine = (employeeId: string | null | undefined) => !ownEmployeeId || employeeId !== ownEmployeeId;
    const jobs: Promise<void>[] = [];
    if (canApproveLeave) {
      jobs.push(
        job('leave', async () => {
          // The company list counts this person's own pending leave, which they may not decide:
          // Requests and Claims leave it out on the server, so it is taken off here, with their
          // own list's count, to make the three rows count the same way on either server.
          const [page, own] = await Promise.all([
            leaveService.getAllLeaveApplications({ status: 'PENDING', page: 1, pageSize: listSize }),
            ownEmployeeId
              ? leaveService.getApplications({ status: 'PENDING', page: 1, pageSize: 1 }).then(totalOf, () => 0)
              : Promise.resolve(0),
          ]);
          const items = (page.items ?? []).filter((l) => notMine(l.employeeId)).map(fromLeave);
          return { count: Math.max(0, totalOf(page) - own), items };
        }),
      );
    }
    if (canApproveRequests) {
      // Pending and not the approver's own: the same queue as Request Approval's Pending tab.
      jobs.push(
        job('requests', async () => {
          const page = await requestService.getPendingApprovals({ page: 1, pageSize: listSize });
          return { count: page.total, items: page.items.map(fromRequest) };
        }),
      );
    }
    if (canApproveClaims) {
      jobs.push(
        job('claims', async () => {
          const page = await claimService.getPendingApprovals({ page: 1, pageSize: listSize });
          return { count: page.total, items: (page.items ?? []).filter((c) => notMine(c.employeeId)).map(fromClaim) };
        }),
      );
    }
    if (deptApprover) {
      jobs.push(
        job('dept', async () => {
          const page = await leaveService.getPendingApprovals({ page: 1, pageSize: listSize });
          return { count: totalOf(page), items: (page.items ?? []).filter((l) => notMine(l.employeeId)).map(fromLeave) };
        }),
      );
    }
    if (canSeePunches) {
      // Waiting ones only (no status), less this person's own, as the Punch Approval list shows.
      jobs.push(
        job('punch', async () => {
          const rows = await attendanceService.getTeamPunchRequests();
          return { count: rows.filter((r) => notMine(r.employeeId)).length, items: [] };
        }),
      );
    }
    await Promise.allSettled(jobs);
  }, [canApproveRequests, canApproveLeave, canApproveClaims, deptApprover, canSeePunches, ownEmployeeId, listSize, tenantId]);

  const loadTeam = useCallback(async () => {
    const run = ++teamRun.current;
    if (!tenantId || !canSeeTeam) return;
    try {
      const snapshot = await dashboardService.getTeamSnapshot();
      if (teamRun.current === run) setTeam(snapshot);
    } catch {
      if (teamRun.current === run) setTeam('failed');
    }
  }, [canSeeTeam, tenantId]);

  useFocusEffect(
    useCallback(() => {
      void loadMine();
    }, [loadMine]),
  );
  useFocusEffect(
    useCallback(() => {
      void loadApprovals();
    }, [loadApprovals]),
  );
  useFocusEffect(
    useCallback(() => {
      void loadTeam();
    }, [loadTeam]),
  );

  // The rights are asked for again too: a right granted or removed on the web shows here
  // without restarting the app. When they change, the loaders change with them and run again.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshAccess(), refreshDept(), loadMine(), loadApprovals(), loadTeam()]);
    setRefreshing(false);
  }, [refreshAccess, refreshDept, loadMine, loadApprovals, loadTeam]);

  const go = (screen: keyof RootStackParamList) => (navigation.navigate as (s: string) => void)(screen);

  const openWaiting = (w: Waiting) => {
    if (w.kind === 'leave') goTo(navigation, 'LeaveDetails', { leaveId: w.id, canApprove: true });
    else if (w.kind === 'request') goTo(navigation, 'RequestDetails', { requestId: w.id, canApprove: true });
    else goTo(navigation, 'ClaimDetails', { claimId: w.id, canApprove: true });
  };

  // One row per right, so a missing right leaves no hole the way a missing tile did.
  const decideRows: DecideRow[] = [];
  if (canApproveLeave) decideRows.push({ key: 'leave', label: 'Leave', icon: 'calendar-check-outline', screen: 'Leaves' });
  if (canApproveRequests) decideRows.push({ key: 'requests', label: 'Requests', icon: 'text-box-check-outline', screen: 'Requests' });
  if (canApproveClaims) decideRows.push({ key: 'claims', label: 'Claims', icon: 'receipt-text-check-outline', screen: 'ClaimsApproval' });
  if (deptApprover) decideRows.push({ key: 'dept', label: 'Department leave', icon: 'account-group-outline', screen: 'Leaves' });
  if (canSeePunches) decideRows.push({ key: 'punch', label: 'Punch requests', icon: 'clock-edit-outline', screen: 'PunchApproval' });

  const showApprovals = canApproveLeave || canApproveRequests || canApproveClaims;
  const decides = decideRows.length > 0;
  // Nine entries in two columns do not fit a phone; three columns do, under two headings.
  const compactMine = decides;

  const visibleQueues = decideRows.map((r) => queues[r.key]);
  const waiting = mergeWaiting(visibleQueues, listSize);
  const queuesLoading = visibleQueues.some((q) => q.count === null);
  const nothingWaiting = visibleQueues.length > 0 && visibleQueues.every((q) => q.count === 0);
  const showTeam = canSeeTeam && team !== null;

  const someFailed =
    visibleQueues.some((q) => q.count === 'failed') || (linked && mineLoad === 'partial') || (showTeam && team === 'failed');

  const leaveNote = mine.leave
    ? compactMine
      ? `${mine.leave.label}: ${dayNumber(mine.leave.days)} days`
      : `${dayNumber(mine.leave.days)} ${mine.leave.label} days left`
    : '';

  const myTiles: Tile[] = linked
    ? [
        { key: 'm-req', title: 'My Requests', short: 'Requests', note: pendingNote(mine.requests), icon: 'text-box-outline', screen: 'MyRequests' },
        { key: 'm-leave', title: 'My Leaves', short: 'Leave', note: leaveNote, icon: 'calendar-clock-outline', screen: 'MyLeaves' },
        { key: 'm-slip', title: 'My Payslip', short: 'Payslip', note: mine.payslip ?? '', icon: 'wallet-outline', screen: 'MyPayslip' },
        {
          key: 'm-docs',
          title: 'My Documents',
          short: 'Documents',
          note: mine.docs === null ? '' : mine.docs > 0 ? `${mine.docs} to send` : 'All provided',
          attention: (mine.docs ?? 0) > 0,
          icon: 'file-document-outline',
          screen: 'MyDocuments',
        },
        { key: 'm-claim', title: 'My Claims', short: 'Claims', note: pendingNote(mine.claims), icon: 'receipt-text-outline', screen: 'Claims' },
        // The record, not the clock -- punching is the raised button in the bottom bar.
        { key: 'm-att', title: 'My Attendance', short: 'Attendance', note: mine.punch ?? '', icon: 'clock-check-outline', screen: 'Attendance' },
      ]
    : [];

  const tileWidth = (cols: number) => Math.floor((width - PAD * 2 - GAP * (cols - 1)) / cols);
  const mineCols = compactMine ? 3 : 2;

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  const viewAll = (
    <TouchableOpacity
      onPress={() => go('Search')}
      style={styles.viewAll}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="View all services"
    >
      <Text style={styles.viewAllText} maxFontSizeMultiplier={1.25}>View all</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={C.blue} />
    </TouchableOpacity>
  );

  const heading = (title: string, first: boolean, right?: React.ReactNode) => (
    <View style={[styles.sectionRow, !first && styles.sectionRowNext]}>
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.25}>{title}</Text>
      {right ?? null}
    </View>
  );

  const countView = (count: Count) => {
    if (count === null) return <View style={styles.skeletonCount} />;
    if (count === 'failed') return <Text style={styles.failedText} maxFontSizeMultiplier={1.25}>Couldn't load</Text>;
    return (
      <Text style={[styles.count, count > 0 && styles.countAttention]} maxFontSizeMultiplier={1.25}>
        {count}
      </Text>
    );
  };

  const countLabel = (count: Count) =>
    count === null ? 'loading' : count === 'failed' ? 'could not load' : count > 0 ? `${count} waiting` : 'nothing waiting';

  // ── Sections ──

  const decideSection = (first: boolean) =>
    decides ? (
      <React.Fragment key="decide">
        {heading('To decide', first, first ? viewAll : null)}
        <View style={styles.card}>
          {decideRows.map((r, i) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.decideRow, i > 0 && styles.rowDivider]}
              onPress={() => go(r.screen)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${r.label}, ${countLabel(queues[r.key].count)}`}
            >
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name={r.icon} size={20} color={ICON_TINT} />
              </View>
              <Text style={styles.decideLabel} numberOfLines={1} maxFontSizeMultiplier={1.25}>
                {r.label}
              </Text>
              {countView(queues[r.key].count)}
              <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </React.Fragment>
    ) : null;

  const waitingSection = (first: boolean) => {
    if (!decides) return null;
    let content: React.ReactNode = null;
    if (waiting.length > 0) {
      content = (
        <View style={styles.card}>
          {waiting.map((w, i) => {
            const applied = appliedText(w.createdAt);
            return (
              <TouchableOpacity
                key={w.key}
                style={[styles.waitRow, i > 0 && styles.rowDivider]}
                onPress={() => openWaiting(w)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={joined(w.name, w.what, applied)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText} maxFontSizeMultiplier={1.2}>{initials(w.name)}</Text>
                </View>
                <View style={styles.flex}>
                  <View style={styles.nameLine}>
                    <Text style={styles.waitName} numberOfLines={1} maxFontSizeMultiplier={1.25}>
                      {w.name}
                    </Text>
                    {w.code ? (
                      <Text style={styles.waitCode} numberOfLines={1} maxFontSizeMultiplier={1.25}>
                        {w.code}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.whatLine}>
                    <MaterialCommunityIcons name={w.icon} size={14} color={C.body} style={styles.whatIcon} />
                    {/* Two lines, never cut: the dates are what the approver is deciding on. */}
                    <Text style={styles.waitWhat} numberOfLines={2} maxFontSizeMultiplier={1.25}>
                      {w.what}
                    </Text>
                  </View>
                  {applied ? (
                    <Text style={styles.waitMeta} numberOfLines={1} maxFontSizeMultiplier={1.25}>
                      {applied}
                    </Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      );
    } else if (queuesLoading) {
      content = (
        <View style={styles.card}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.waitRow, i > 0 && styles.rowDivider]}>
              <View style={[styles.avatar, styles.skeletonFill]} />
              <View style={styles.flex}>
                <View style={[styles.skeletonLine, { width: '45%' }]} />
                <View style={[styles.skeletonLine, { width: '70%', marginTop: 8 }]} />
              </View>
            </View>
          ))}
        </View>
      );
    } else if (nothingWaiting) {
      content = (
        <View style={[styles.card, styles.emptyRow]}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={C.body} />
          <Text style={styles.emptyText} maxFontSizeMultiplier={1.25}>Nothing is waiting for you</Text>
        </View>
      );
    }
    // Failed with nothing to list: the retry row at the top already says so.
    if (!content) return null;
    return (
      <React.Fragment key="waiting">
        {heading('Waiting for you', first)}
        {content}
      </React.Fragment>
    );
  };

  const teamSection = (first: boolean) => {
    if (!showTeam) return null;
    const snapshot = typeof team === 'object' ? team : null;
    const inner = (
      <>
        <View style={styles.teamHead}>
          <View style={styles.rowIcon}>
            <MaterialCommunityIcons name="account-clock-outline" size={20} color={ICON_TINT} />
          </View>
          <Text style={styles.teamTitle} maxFontSizeMultiplier={1.25}>Team today</Text>
          {snapshot ? (
            <Text style={styles.teamOf} numberOfLines={1} maxFontSizeMultiplier={1.25}>
              of {snapshot.total} {snapshot.total === 1 ? 'employee' : 'employees'}
            </Text>
          ) : null}
          {teamOpen ? <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} /> : null}
        </View>
        {team === 'loading' ? (
          <View style={styles.figures}>
            <View style={styles.figure}>
              <View style={[styles.skeletonLine, { width: 36, height: 18 }]} />
            </View>
            <View style={styles.figure}>
              <View style={[styles.skeletonLine, { width: 36, height: 18 }]} />
            </View>
          </View>
        ) : team === 'failed' ? (
          <Text style={[styles.failedText, styles.teamFailed]} maxFontSizeMultiplier={1.25}>Couldn't load</Text>
        ) : snapshot ? (
          <View style={styles.figures}>
            <View style={styles.figure}>
              <Text style={styles.figureNumber} maxFontSizeMultiplier={1.25}>{snapshot.present}</Text>
              <Text style={styles.figureLabel} numberOfLines={1} maxFontSizeMultiplier={1.25}>punched in</Text>
            </View>
            <View style={styles.figureDivider} />
            {/* "Not punched in", never "absent": the server counts everybody without an IN punch,
                so rest days and leave are in this number. */}
            <View style={styles.figure}>
              <Text style={styles.figureNumber} maxFontSizeMultiplier={1.25}>{snapshot.notIn}</Text>
              <Text style={styles.figureLabel} numberOfLines={1} maxFontSizeMultiplier={1.25}>not punched in</Text>
            </View>
          </View>
        ) : null}
      </>
    );
    // Titled inside the card, so it needs no heading of its own above it.
    const cardStyle = [styles.card, styles.teamCard, !first && styles.teamCardNext];
    return (
      <React.Fragment key="team">
        {/* Employee List reads team-today, which still needs an employee record on the server:
            for HR without one the card is a figure to read, not a door that opens on an error,
            until the server lets them in (useTeamTodayOpen asks it once). */}
        {teamOpen ? (
          <TouchableOpacity
            style={cardStyle}
            onPress={() => go('EmployeeList')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              snapshot ? `Team today: ${snapshot.present} punched in, ${snapshot.notIn} not punched in, of ${snapshot.total}` : 'Team today'
            }
          >
            {inner}
          </TouchableOpacity>
        ) : (
          <View style={cardStyle}>{inner}</View>
        )}
      </React.Fragment>
    );
  };

  const renderGrid = (tiles: Tile[], cols: number) => {
    const compact = cols === 3;
    const w = tileWidth(cols);
    return (
      <View style={styles.grid}>
        {tiles.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tile, compact && styles.tileCompact, { width: w }]}
            onPress={() => go(t.screen)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t.note ? `${t.title}, ${t.note}` : t.title}
          >
            <View style={styles.tileTop}>
              <View style={[styles.tileIcon, compact && styles.tileIconCompact]}>
                <MaterialCommunityIcons name={t.icon} size={compact ? 18 : 20} color={ICON_TINT} />
              </View>
              {compact ? null : <MaterialCommunityIcons name="chevron-right" size={18} color={C.muted} />}
            </View>
            <Text
              style={[styles.tileTitle, compact && styles.tileTitleCompact]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={1.25}
            >
              {compact ? t.short : t.title}
            </Text>
            {/* A fixed height for the note, so the tiles in a row stay level while it loads. */}
            <View style={compact ? styles.noteBoxCompact : styles.noteBox}>
              {t.note ? (
                <Text style={[styles.tileNote, t.attention && styles.tileNoteAttention]} numberOfLines={compact ? 2 : 1} maxFontSizeMultiplier={1.25}>
                  {t.note}
                </Text>
              ) : mineLoad === 'loading' ? (
                <View style={styles.skeletonNote} />
              ) : (
                <Text style={styles.tileNote} maxFontSizeMultiplier={1.25}>{mineLoad === 'partial' ? '—' : ' '}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const mineSection = (first: boolean) =>
    linked ? (
      <React.Fragment key="mine">
        {heading(compactMine ? 'My work' : 'Quick access', first, first ? viewAll : null)}
        {renderGrid(myTiles, mineCols)}
      </React.Fragment>
    ) : null;

  // Activity is the person's own history, so it needs an employee record behind it.
  const activitySection = () =>
    linked ? (
      <TouchableOpacity key="activity" style={[styles.card, styles.linkRow]} onPress={() => go('Activity')} activeOpacity={0.7} accessibilityRole="button">
        <View style={styles.rowIcon}>
          <MaterialCommunityIcons name="history" size={20} color={ICON_TINT} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.linkTitle} maxFontSizeMultiplier={1.25}>Recent activity</Text>
          <Text style={styles.linkNote} numberOfLines={1} maxFontSizeMultiplier={1.25}>Requests, leave, claims and payslips</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
      </TouchableOpacity>
    ) : null;

  // HR's work comes first: what to decide, the team, who is waiting, then their own items. A
  // department approver is an employee first, so their own items lead and their queue follows.
  // The Waiting list is the one part whose length varies, so it goes after the fixed parts.
  const order = showApprovals
    ? [decideSection, teamSection, waitingSection, mineSection]
    : [mineSection, decideSection, waitingSection, teamSection];
  let placed = 0;
  const sections = order.map((section) => {
    const node = section(placed === 0);
    if (node) placed += 1;
    return node;
  });

  // Somebody with no employee record has only approvals here; until the server has said which,
  // there is nothing true to show yet.
  const body = (() => {
    if (!linked && !access.ready) {
      return access.failed ? (
        <DocumentState
          icon="cloud-off-outline"
          tone="danger"
          title="Could not load your access"
          body="Check your connection, then try again."
          onRetry={() => { void onRefresh(); }}
        />
      ) : (
        <Busy />
      );
    }
    if (!linked && !decides) {
      return (
        <DocumentState
          icon="account-alert-outline"
          title="No employee record here"
          body={`Ask HR to link your account to your employee record in ${user?.tenantName ?? 'this company'}.`}
        />
      );
    }
    return null;
  })();

  // The approvals could not be fetched for somebody whose role says HR: say so, rather than
  // silently showing them an employee's home. Otherwise one row for any figure that failed.
  const retryText =
    linked && !access.ready && access.failed && access.any
      ? 'Could not load your approvals'
      : !body && someFailed
        ? 'Some figures could not load'
        : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        {/* No wordmark: it took ~95pt of this row and cut the company name to "PRISMA TECHNOLOGY SO…". */}
        <View style={styles.topBar}>
          <View style={styles.switcherSlot}>
            <CompanySwitcher />
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => go('Notifications')}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          >
            <MaterialCommunityIcons name="bell-outline" size={23} color={C.ink} />
            {unread > 0 ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting} numberOfLines={1} maxFontSizeMultiplier={1.25}>
          {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
        </Text>
        <Text style={styles.date} maxFontSizeMultiplier={1.25}>{todayText()}</Text>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.scroll, { paddingBottom: navSpace + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
      >
        {body}

        {retryText ? (
          <TouchableOpacity style={styles.retryRow} onPress={() => { void onRefresh(); }} activeOpacity={0.8} accessibilityRole="button">
            <MaterialCommunityIcons name="cloud-off-outline" size={18} color={C.danger} />
            <Text style={styles.retryText} maxFontSizeMultiplier={1.25}>{retryText}</Text>
            <Text style={styles.retryAction} maxFontSizeMultiplier={1.25}>Try again</Text>
          </TouchableOpacity>
        ) : null}

        {body ? null : sections}

        {body ? null : activitySection()}
      </ScrollView>

      <BottomNavBar activeScreen="home" />
    </View>
  );
};

const cardShadow = {
  shadowColor: C.ink,
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1, minWidth: 0 },

  // A soft blue band, no picture: the old hero spent ~250pt of the first screen on a
  // greeting and an illustration, and pushed the tiles below the fold on every phone.
  header: { backgroundColor: '#E8F0FE', paddingHorizontal: PAD, paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  switcherSlot: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: -8 },
  dot: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#E8F0FE' },
  greeting: { fontSize: 20, fontWeight: '700', color: C.ink, marginTop: 6 },
  date: { fontSize: 13, color: C.body, marginTop: 2 },

  // The content sheet rides up over the band with rounded shoulders.
  sheet: { flex: 1, marginTop: -14 },
  scroll: {
    flexGrow: 1,
    backgroundColor: '#F6F8FF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: PAD,
    paddingTop: 14,
  },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32, marginBottom: 6 },
  sectionRowNext: { marginTop: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  viewAll: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  viewAllText: { fontSize: 13, fontWeight: '600', color: C.blue },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    ...cardShadow,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.line },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: ICON_WASH, justifyContent: 'center', alignItems: 'center' },

  // To decide
  decideRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14 },
  decideLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  count: { fontSize: 17, fontWeight: '700', color: C.muted, minWidth: 20, textAlign: 'right' },
  countAttention: { color: ATTENTION },
  failedText: { fontSize: 12, fontWeight: '600', color: C.danger },
  skeletonCount: { width: 48, height: 10, borderRadius: 5, backgroundColor: SKELETON },

  // Waiting for you
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10 },
  // The approval cards' initials wash, so a person looks the same here and on the list.
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: APPROVAL_AVATAR_BG, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: C.ink },
  nameLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  waitName: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: C.ink },
  waitCode: { flexShrink: 0, maxWidth: '40%', fontSize: 12, color: C.muted },
  whatLine: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 },
  whatIcon: { marginTop: 2, marginRight: 5 },
  waitWhat: { flex: 1, fontSize: 13, lineHeight: 18, color: C.ink },
  waitMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14 },
  emptyText: { flex: 1, fontSize: 14, color: C.body },
  skeletonFill: { backgroundColor: SKELETON },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: SKELETON },

  // Team today
  teamCard: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  teamCardNext: { marginTop: 14 },
  teamHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  teamOf: { fontSize: 12, color: C.muted, flexShrink: 1 },
  teamFailed: { marginTop: 12, marginLeft: 48 },
  figures: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginLeft: 48 },
  figure: { flex: 1, minWidth: 0 },
  figureNumber: { fontSize: 22, fontWeight: '700', color: C.ink },
  figureLabel: { fontSize: 12, color: C.body, marginTop: 1 },
  figureDivider: { width: 1, alignSelf: 'stretch', backgroundColor: C.line, marginHorizontal: 12 },

  // Widths are computed from the window, never percentages: 48.5% plus a 10pt gap did not fit
  // two tiles on a 360dp Android phone, and the grid fell apart into one half-width column.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.line,
    ...cardShadow,
  },
  tileCompact: { padding: 10 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tileIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: ICON_WASH, justifyContent: 'center', alignItems: 'center' },
  tileIconCompact: { width: 30, height: 30, borderRadius: 9 },
  tileTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  tileTitleCompact: { fontSize: 13 },
  noteBox: { minHeight: 18, marginTop: 2, justifyContent: 'center' },
  noteBoxCompact: { minHeight: 34, marginTop: 2 },
  tileNote: { fontSize: 12, lineHeight: 16, color: C.body },
  tileNoteAttention: { color: ATTENTION, fontWeight: '600' },
  skeletonNote: { width: 48, height: 10, borderRadius: 5, backgroundColor: SKELETON, marginTop: 3 },

  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    marginBottom: 6,
  },
  retryText: { flex: 1, fontSize: 13, color: C.danger },
  retryAction: { fontSize: 13, fontWeight: '700', color: C.danger },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 14 },
  linkTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  linkNote: { fontSize: 12, color: C.body, marginTop: 1 },
});

export default PayrollHomeScreen;
