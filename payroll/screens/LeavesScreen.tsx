/**
 * Leave Approval — the queue of leave applications waiting on whoever can decide them.
 *
 * The one job of this page is triage: an approver should be able to work down
 * the list and know, without opening a single row, who asked, for what, for how
 * long, and how long it has already sat here. So every card carries the whole
 * question — applicant, leave type, the dates and the day count, how long it has
 * waited and on whom — and the row opens only when the reason needs reading.
 *
 * The failure state is the reason this screen was rewritten. It used to swallow
 * the error in a console.error and fall through to "no leave applications
 * found", so an approver hitting an outage was told the queue was empty, closed
 * the app, and left real leave unactioned. Loading, failed and empty are now
 * three different answers, and the failed one says what went wrong and offers a
 * way to try again — the same shape My Leaves, Leave Type and Leave History use.
 *
 * It opens on Pending, earliest start first, and reads the whole of it: the server
 * sorts newest first, so a single page of 50 silently dropped exactly the
 * applications that had waited longest. The other tabs page as you scroll.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { BottomNavBar, useBottomNavSpace } from '../components/BottomNavBar';
import { useDialog } from '../components/ui/AppDialog';
import { ApprovalPerson } from '../components/ui/ApprovalCard';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { STATUSES } from '../constants/statuses';
import leaveService, { LeaveApplication, LeavePage } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import { parseDate, shortDate } from '../components/requests/RequestUi';
import {
  DecisionButtons,
  LEAVE_CARD,
  LeaveHeader,
  LeaveState,
  LeaveStatusPill,
  approveConfirmText,
  dateRangeText,
  daysSince,
  decisionFailure,
  decisionOutcome,
  decisionsRefused,
  leaveLength,
  leaveTint,
  rejectPrompt,
  startNote,
  takeHandedOffNotice,
  todayInMalaysia,
  useLeaveToast,
} from '../components/leave/LeaveUi';

/** Pending first: it is the only tab that asks anything of the approver. */
const FILTERS = [
  { key: STATUSES.PENDING, label: 'Pending' },
  { key: 'ALL', label: 'All' },
  { key: STATUSES.APPROVED, label: 'Approved' },
  { key: STATUSES.REJECTED, label: 'Rejected' },
  { key: STATUSES.CANCELLED, label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const PAGE_SIZE = 50;
/** Pending is read to the end; the cap only stops a wrong total from looping forever. */
const PENDING_PAGE_CAP = 20;

type Fetch = (params: { page: number; pageSize: number; status?: string }) => Promise<LeavePage>;

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; tab: FilterKey; leaves: LeaveApplication[]; total: number; pages: number; more: boolean }
  | { kind: 'failed'; message: string };

/** Why a read was started; only the first may replace the queue with an error. */
type Mode = 'initial' | 'focus' | 'refresh';

/** The statuses one tab is made of. Cancelled includes the leave employees withdrew. */
function sourcesFor(tab: FilterKey): (string | undefined)[] {
  if (tab === 'ALL') return [undefined];
  if (tab === STATUSES.CANCELLED) return [STATUSES.CANCELLED, STATUSES.WITHDRAWN];
  return [tab];
}

/** Pages `from` to `to` of every status a tab is made of, stopping at the last real page. */
async function readQueue(fetchFn: Fetch, tab: FilterKey, from: number, to: number): Promise<LeavePage> {
  const parts = await Promise.all(
    sourcesFor(tab).map(async (status) => {
      const items: LeaveApplication[] = [];
      let total = 0;
      for (let page = from; page <= to; page += 1) {
        const result = await fetchFn({ page, pageSize: PAGE_SIZE, status });
        items.push(...result.items);
        total = result.total;
        if (result.items.length < PAGE_SIZE || page * PAGE_SIZE >= total) break;
      }
      return { items, total };
    }),
  );
  return {
    items: parts.flatMap((p) => p.items),
    total: parts.reduce((sum, p) => sum + p.total, 0),
  };
}

/**
 * One row per application, in the order the tab is worked in. Pending runs by
 * start date, earliest first: urgency comes from when the leave begins, not
 * from when it was applied for, and a leave starting tomorrow must not sit
 * under one for December. Everything else reads as history, newest first. The
 * merged Cancelled tab needs the sort as well, or its two halves sit end to end.
 */
function arrange(items: LeaveApplication[], tab: FilterKey): LeaveApplication[] {
  // A leave submitted while paging shifts the page boundaries and can arrive twice.
  const byId = new Map<string, LeaveApplication>();
  items.forEach((l) => {
    // The web list without a status includes employees' unsubmitted drafts,
    // which nobody can decide and HR should not be reading.
    if (tab === 'ALL' && (l.status ?? '').toUpperCase() === STATUSES.DRAFT) return;
    byId.set(l.id, l);
  });
  const unique = Array.from(byId.values());
  const time = (l: LeaveApplication) => parseDate(l.createdAt)?.getTime() ?? 0;
  if (tab === STATUSES.PENDING) {
    // Plain YYYY-MM-DD strings compare in date order without parsing.
    const start = (l: LeaveApplication) => (l.startDate ?? '').slice(0, 10);
    return unique.sort((a, b) => start(a).localeCompare(start(b)) || time(a) - time(b));
  }
  return unique.sort((a, b) => time(b) - time(a));
}

/** "4 Sep" this year, "4 Sep 2025" otherwise: the card's meta line has little room. */
function appliedShort(iso: string | null | undefined): string {
  const full = shortDate(iso);
  const year = ` ${todayInMalaysia().slice(0, 4)}`;
  return full.endsWith(year) ? full.slice(0, -year.length) : full;
}

/** Whether a "Name, Name" approver list includes the person reading it. */
function namesInclude(list: string | null | undefined, name: string | null | undefined): boolean {
  const me = (name ?? '').trim().toLowerCase();
  if (!me || !list) return false;
  return list.split(',').some((n) => n.trim().toLowerCase() === me);
}

interface LeavesScreenProps {
  navigation?: any;
}

export const LeavesScreen: React.FC<LeavesScreenProps> = ({ navigation: navProp }) => {
  // Called unconditionally: `navProp || useNavigation()` ran a hook only when the
  // prop was missing, which changes the hook order between renders.
  const fallbackNavigation = useNavigation();
  const navigation = navProp ?? fallbackNavigation;
  const dialog = useDialog();
  const { user, employee } = usePayrollAuth();
  const myId = user?.employeeId ?? employee?.id ?? null;
  // The bar stays on this page like on Request Approval: it is the Leave tab itself for
  // somebody with no employee record, and lights Home for everyone else. The last card
  // must clear the bar, the home indicator and the Punch circle.
  const navSpace = useBottomNavSpace(!!user?.employeeId);
  // Everyone's leave, for whoever holds the leave approval right (useApproverAccess).
  // Nothing is read until the right is known: the first answer is a role-name guess,
  // and an HR role that is not Owner was sent to the department approver's list,
  // which answered "No employee record linked" and flashed an error over the queue.
  const access = useApproverAccess();
  const isHR = access.leave;
  // Without a user and company the rights are never asked for; the guess is all there is.
  const accessKnown = access.ready || access.failed || !(user?.uid && user?.tenantId);
  // Department approvers see the leave of their departments; they may decide only what is
  // waiting on them right now, not a leave their step already passed on to HR.
  const [waitingOnMe, setWaitingOnMe] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<FilterKey>(STATUSES.PENDING);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  // Which button is working, so only that one spins; the ref is the guard. It is
  // set before the confirm opens, because the dialog queues: a fast double tap
  // used to queue two confirms and send two approvals, which on a multi-step
  // leave approved step 2 straight after step 1.
  const [acting, setActing] = useState<{ id: string; kind: 'approve' | 'reject' } | null>(null);
  const actingRef = useRef<string | null>(null);
  const toast = useLeaveToast(dialog, navSpace + 8);

  const loadRef = useRef(load);
  loadRef.current = load;
  const loadingMoreRef = useRef(false);
  const focused = useRef(false);
  // Only the newest read may write. The approval right arrives a moment after
  // the role-name guess and switches endpoints, and tabs can be tapped faster
  // than the server answers; without this whichever answer landed last won,
  // and HR could see "access denied" over a queue that had loaded fine.
  const seq = useRef(0);

  const fetchFn: Fetch = isHR
    ? (params) => leaveService.getAllLeaveApplications(params)
    : (params) => leaveService.getApproverLeaves(params);

  const show = useCallback(async (mode: Mode) => {
    const mine = ++seq.current;
    const tab = activeTab;
    const current = loadRef.current;
    // A refresh keeps as many pages as are already on screen, so the list does
    // not shrink under an approver who has scrolled down it.
    const pages = tab === STATUSES.PENDING
      ? PENDING_PAGE_CAP
      : current.kind === 'ready' && current.tab === tab ? current.pages : 1;

    if (mode === 'initial') setLoad({ kind: 'loading' });
    setMoreFailed(false);

    if (!isHR) {
      leaveService
        .getPendingApprovals({ page: 1, pageSize: 200 })
        .then((r) => { if (mine === seq.current) setWaitingOnMe(new Set(r.items.map((l) => l.id))); })
        .catch(() => { if (mine === seq.current) setWaitingOnMe(new Set()); });
    }

    try {
      const result = await readQueue(fetchFn, tab, 1, pages);
      if (mine !== seq.current) return;
      const arranged = arrange(result.items, tab);
      // Nobody decides their own leave, so on Pending it is not part of the queue: HR who is
      // also an employee would otherwise find their own application waiting on themselves, and
      // the count here would not match Home's Leave row, which leaves it out. Pending is read
      // to the end, so the server's total less the rows dropped is the true count. It still
      // shows under the other tabs, marked as theirs.
      const leaves = tab === STATUSES.PENDING && myId ? arranged.filter((l) => l.employeeId !== myId) : arranged;
      setLoad({
        kind: 'ready',
        tab,
        leaves,
        total: Math.max(0, result.total - (arranged.length - leaves.length)),
        pages: tab === STATUSES.PENDING ? 1 : pages,
        more: tab !== STATUSES.PENDING && leaves.length < result.total,
      });
    } catch (err) {
      if (mine !== seq.current) return;
      const message = serverMessage(err, 'Could not load the approval queue.');
      // The whole point of the rewrite: an outage reads as an outage, not as an
      // empty queue. A later refresh that fails keeps the rows already shown.
      if (mode === 'initial' || loadRef.current.kind !== 'ready') {
        setLoad({ kind: 'failed', message });
      } else if (mode === 'refresh' && focused.current) {
        void dialog.notify({ title: 'Could not refresh the queue', message, tone: 'danger' });
      }
    }
    // fetchFn is rebuilt every render but only ever changes with isHR.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isHR, dialog, myId]);

  // On focus rather than on mount, so deciding a leave on the detail screen and
  // coming back does not leave the queue showing the row you just cleared. The
  // refresh is quiet when this tab is already on screen, so the approver keeps
  // their place in the list instead of jumping back to the top.
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (accessKnown) {
        const current = loadRef.current;
        void show(current.kind === 'ready' && current.tab === activeTab ? 'focus' : 'initial');
      }
      return () => {
        focused.current = false;
      };
    }, [show, activeTab, accessKnown]),
  );

  // A decision made on the details page is confirmed here, where the approver lands.
  const showToast = toast.show;
  useFocusEffect(
    useCallback(() => {
      const notice = takeHandedOffNotice();
      if (notice) showToast(notice);
    }, [showToast]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await show('refresh');
    setRefreshing(false);
  }, [show]);

  const loadMore = useCallback(async () => {
    const current = loadRef.current;
    if (current.kind !== 'ready' || !current.more || loadingMoreRef.current) return;
    const mine = seq.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const next = current.pages + 1;
      const result = await readQueue(fetchFn, current.tab, next, next);
      if (mine !== seq.current) return;
      const leaves = arrange([...current.leaves, ...result.items], current.tab);
      setLoad({
        ...current,
        leaves,
        total: result.total,
        pages: next,
        // A page that added nothing new ends the paging, so a total that is off
        // by one cannot keep the list asking forever.
        more: leaves.length > current.leaves.length && leaves.length < result.total,
      });
    } catch {
      if (mine === seq.current) setMoreFailed(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHR]);

  const openLeave = (leave: LeaveApplication) => {
    navigation.navigate('LeaveDetails', { leaveId: leave.id, canApprove: true });
  };

  /**
   * After a decision lands: the row leaves the Pending tab at once, a toast
   * says what happened, and the queue re-reads quietly behind it.
   *
   * It used to wait for a full re-read before the row went, and when that
   * re-read failed the decided card stayed with live buttons whose next tap
   * could only be refused. A leave the server left PENDING (one step approved,
   * the next still to come) stays: HR can still decide it, and for a
   * department approver it simply stops being theirs.
   */
  const decided = (leave: LeaveApplication, kind: 'approve' | 'reject', result: LeaveApplication | undefined) => {
    const stillPending = (result?.status ?? '').toUpperCase() === STATUSES.PENDING;
    if (!stillPending) {
      setLoad((c) => (c.kind === 'ready' && c.tab === STATUSES.PENDING
        ? { ...c, leaves: c.leaves.filter((l) => l.id !== leave.id), total: Math.max(0, c.total - 1) }
        : c));
    } else if (!isHR) {
      setWaitingOnMe((s) => {
        const next = new Set(s);
        next.delete(leave.id);
        return next;
      });
    }
    toast.show(decisionOutcome(kind, leave.employeeName || 'Employee', result));
    void show('focus');
  };

  const approve = async (leave: LeaveApplication) => {
    if (actingRef.current) return;
    actingRef.current = leave.id;
    try {
      // The facts only. Whether this finishes the leave or passes it on depends
      // on the server, so the toast afterwards says which it was.
      const waitingOn = (leave.currentApproverName ?? '').trim();
      const someoneElse = isHR && waitingOn && !namesInclude(waitingOn, user?.name) ? waitingOn : null;
      const ok = await dialog.confirm({
        title: 'Approve this leave?',
        message: approveConfirmText(leave, someoneElse),
        confirmText: 'Approve',
      });
      if (!ok) return;
      setActing({ id: leave.id, kind: 'approve' });
      const result = await leaveService.approveLeave(leave.id);
      decided(leave, 'approve', result);
    } catch (err) {
      await dialog.notify({
        title: 'Could not approve',
        message: decisionFailure(err, myId !== null),
        tone: 'danger',
      });
    } finally {
      actingRef.current = null;
      setActing(null);
    }
  };

  const reject = async (leave: LeaveApplication) => {
    if (actingRef.current) return;
    actingRef.current = leave.id;
    try {
      const reason = await rejectPrompt(dialog);
      if (!reason) return;
      setActing({ id: leave.id, kind: 'reject' });
      const result = await leaveService.rejectLeave(leave.id, reason);
      decided(leave, 'reject', result);
    } catch (err) {
      await dialog.notify({
        title: 'Could not reject',
        message: decisionFailure(err, myId !== null),
        tone: 'danger',
      });
    } finally {
      actingRef.current = null;
      setActing(null);
    }
  };

  const leaves = load.kind === 'ready' ? load.leaves : [];
  const total = load.kind === 'ready' ? load.total : 0;

  const subtitle = (() => {
    if (load.kind === 'failed') return 'The queue could not be read';
    if (load.kind === 'loading') return null;
    if (activeTab === STATUSES.PENDING) {
      if (total === 0) return 'Nothing waiting';
      return leaves.length < total
        ? `Showing ${leaves.length} of ${total} waiting`
        : `${total} waiting for a decision`;
    }
    return `${total} ${total === 1 ? 'application' : 'applications'}`;
  })();

  /**
   * The approval card, row by row: who (and, off the Pending tab, where it
   * stands), what, when and for how long, why, and how long it has waited.
   *
   * The dates have a line of their own with no line limit, so a range wraps
   * instead of being cut to "14 – 15 Sep 202…" and the day count always shows.
   * The card body and the decision buttons are siblings, not nested: inside one
   * touchable a screen reader heard the card as one element and could not
   * reach Approve or Reject at all.
   */
  const renderCard = ({ item }: { item: LeaveApplication }) => {
    const tint = leaveTint({ color: item.leaveTypeColor, code: item.leaveTypeCode });
    const pending = item.status === STATUSES.PENDING;
    const own = myId !== null && item.employeeId === myId;
    const name = item.employeeName || 'Employee';
    const code = [item.employeeCode, item.employeeDepartment].filter(Boolean).join(' · ');
    const dates = `${dateRangeText(item.startDate, item.endDate)} · ${leaveLength(item)}`;
    const waited = pending ? daysSince(item.createdAt) : null;
    const waitedText = waited !== null && waited > 0 ? `waiting ${waited} ${waited === 1 ? 'day' : 'days'}` : null;
    const steps = item.totalApprovalSteps ?? 0;
    const waitingOn = pending ? (item.currentApproverName ?? '').trim() : '';
    const urgent = pending ? startNote(item) : null;
    const meta = [
      `Applied ${appliedShort(item.createdAt)}`,
      waitedText,
      waitingOn ? `with ${waitingOn}${steps > 1 ? ` (step ${item.currentApprovalStep} of ${steps})` : ''}` : null,
    ].filter(Boolean).join(' · ');

    // Nobody decides their own leave; the server refuses it, so the buttons
    // would only ever fail. Nor does HR without an employee record once the
    // live server has refused that account: until it is updated the buttons
    // could only fail too, so the card says where to decide instead.
    const mayDecide = pending && !own && (isHR || waitingOnMe.has(item.id));
    const refused = mayDecide && myId === null && decisionsRefused();
    const showStatus = load.kind === 'ready' && load.tab !== STATUSES.PENDING;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => openLeave(item)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${item.leaveTypeDescription || 'leave'}, ${dates}${waitedText ? `, ${waitedText}` : ''}`}
        >
          <ApprovalPerson
            name={name}
            code={code}
            own={own}
            right={showStatus ? <LeaveStatusPill status={item.status} /> : null}
          />

          <View style={styles.typeRow}>
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <Text style={styles.type} numberOfLines={1}>{item.leaveTypeDescription || 'Leave'}</Text>
            {item.attachmentFileName ? (
              <MaterialCommunityIcons name="paperclip" size={14} color={C.muted} accessibilityLabel="Has a file" />
            ) : null}
          </View>
          <Text style={styles.dates}>{dates}</Text>

          {item.reason ? <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text> : null}

          <Text style={styles.meta} numberOfLines={2}>
            {urgent ? <Text style={styles.metaUrgent}>{`${urgent} · `}</Text> : null}
            {meta}
          </Text>
        </TouchableOpacity>

        {mayDecide && !refused ? (
          <View style={styles.actions}>
            <DecisionButtons
              onReject={() => { void reject(item); }}
              onApprove={() => { void approve(item); }}
              acting={acting?.id === item.id ? acting.kind : null}
              disabled={acting !== null}
              name={name}
            />
          </View>
        ) : refused ? (
          <Text style={styles.webOnly}>Decide this on the web for now</Text>
        ) : null}
      </View>
    );
  };

  const footer = () => {
    if (load.kind !== 'ready') return null;
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={C.blue} />
        </View>
      );
    }
    if (moreFailed) {
      return (
        <TouchableOpacity style={styles.footer} onPress={() => { void loadMore(); }} accessibilityRole="button">
          <Text style={styles.footerLink}>Could not load more. Tap to try again.</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const activeLabel = FILTERS.find((f) => f.key === activeTab)?.label.toLowerCase() ?? 'this';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <LeaveHeader title="Leave Approval" subtitle={subtitle} onBack={() => navigation?.goBack()} />

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          style={styles.chipStrip}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => {
            const active = activeTab === item.key;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item.key)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                hitSlop={{ top: 6, bottom: 6 }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'failed' ? (
          <LeaveState
            icon="cloud-off-outline"
            title="Could not load the queue"
            body={load.message}
            tone="danger"
            onRetry={() => { void show('initial'); }}
          />
        ) : (
          <FlatList
            data={leaves}
            keyExtractor={(l) => l.id}
            renderItem={renderCard}
            contentContainerStyle={[styles.list, leaves.length === 0 && styles.listEmpty, { paddingBottom: navSpace + 12 }]}
            showsVerticalScrollIndicator={false}
            onEndReached={() => { void loadMore(); }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={footer()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
            }
            ListEmptyComponent={
              <LeaveState
                fill
                icon={activeTab === STATUSES.PENDING ? 'check-circle-outline' : 'calendar-blank-outline'}
                title={activeTab === STATUSES.PENDING ? 'Nothing waiting' : 'Nothing here'}
                body={
                  activeTab === STATUSES.PENDING
                    ? 'Every leave application has been decided.'
                    : `No leave applications are ${activeLabel === 'all' ? 'on record yet' : activeLabel}.`
                }
              />
            }
          />
        )}
      </SafeAreaView>

      {/* Outside the safe area: the bar pads itself for the home indicator. */}
      <BottomNavBar />
      {toast.node}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  chipStrip: { flexGrow: 0 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 13, fontWeight: '600', color: C.body },
  chipTextActive: { color: '#FFFFFF' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  // Lets the empty state centre itself in the page instead of hugging the chips.
  listEmpty: { flexGrow: 1 },

  card: { ...LEAVE_CARD, padding: 14 },

  // Row 2 onwards, at the same spacing as Request and Claim Approval.
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  type: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: C.ink },
  dates: { fontSize: 13, color: C.body, marginTop: 2 },

  reason: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 6 },

  meta: { fontSize: 12, color: C.muted, marginTop: 8 },
  metaUrgent: { fontWeight: '600', color: C.danger },

  actions: { marginTop: 12 },
  webOnly: { fontSize: 12, color: C.muted, marginTop: 10 },

  footer: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  footerLink: { fontSize: 13, fontWeight: '700', color: C.blue },
});

export default LeavesScreen;
