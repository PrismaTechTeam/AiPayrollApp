/**
 * Punch Requests — the punches the employee asked HR to add.
 *
 * A missed clock-in is not fixed on the phone: the employee says when it really
 * happened and why, HR approves or rejects it, and only an approved one reaches
 * the work card. This page is where the answer shows up, and where a request
 * still waiting can be taken back.
 *
 * Asking for a new one opens its own screen, the same split as My Leaves and
 * Apply for Leave. That button sits above whatever the list is doing: a list
 * that failed to load used to take it away, so someone who needed to report a
 * missed punch was stopped by a read that had nothing to do with it.
 *
 * HR's side of the same requests, everyone's queue, is PunchApprovalScreen
 * further down this file.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { LeaveState } from '../components/leave/LeaveUi';
import { ChipRow, PUNCH_LOOK, PunchRequestCard, TeamPunchCard, punchWhenText } from '../components/attendance/PunchRequestUi';
import attendanceService, { PunchRequest, TeamPunchRequest } from '../api/services/attendanceService';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { serverMessage, statusOfError } from '../lib/serverMessage';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; items: PunchRequest[] }
  | { kind: 'failed'; message: string };

export const PunchRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const alive = useRef(true);

  /**
   * Reads the list. A failure replaces only a spinner or an earlier failure: a list
   * already on screen stays, because a refetch that hit a timeout or a 429 used to
   * wipe every request behind an error card. Returns the failure, if any, so a
   * refresh the person started can say so.
   */
  const fetchList = useCallback(async (): Promise<string | null> => {
    try {
      const items = await attendanceService.getPunchRequests();
      if (alive.current) setLoad({ kind: 'ready', items });
      return null;
    } catch (err) {
      const message = serverMessage(err, 'Could not load your punch requests.');
      if (alive.current) setLoad((prev) => (prev.kind === 'ready' ? prev : { kind: 'failed', message }));
      return message;
    }
  }, []);

  // Refreshes every time the page comes back into view, so a request sent from
  // the form is on the list the moment the form closes. A list already on screen
  // stays there while it refreshes instead of blinking to a spinner.
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setLoad((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
      void fetchList();
      return () => {
        alive.current = false;
      };
    }, [fetchList]),
  );

  const onRefresh = useCallback(async () => {
    const hadList = load.kind === 'ready';
    setRefreshing(true);
    const failure = await fetchList();
    if (!alive.current) return;
    setRefreshing(false);
    // The list stayed; without this the pull would look like it worked.
    if (failure && hadList) void dialog.notify({ title: 'Could not refresh', message: failure, tone: 'danger' });
  }, [fetchList, load.kind, dialog]);

  const retry = () => {
    setLoad({ kind: 'loading' });
    void fetchList();
  };

  const openNew = () => {
    navigation.navigate('CreatePunchRequest');
  };

  const withdraw = async (item: PunchRequest) => {
    const label = PUNCH_LOOK[item.punchType]?.label ?? 'Punch';
    const ok = await dialog.confirm({
      title: 'Withdraw this request?',
      message: `${label} · ${punchWhenText(item.punchTime)}`,
      confirmText: 'Withdraw',
      cancelText: 'Keep it',
      destructive: true,
    });
    if (!ok) return;

    setWithdrawingId(item.id);
    try {
      await attendanceService.cancelPunchRequest(item.id);
    } catch (err) {
      await dialog.notify({
        title: 'Could not withdraw it',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
    // Either way the list is re-read: a refusal usually means HR decided it a
    // moment ago, and the card should say so rather than keep offering Withdraw.
    await fetchList();
    if (alive.current) setWithdrawingId(null);
  };

  const waiting = load.kind === 'ready' ? load.items.filter((i) => (i.status ?? '').toUpperCase() === 'REQUESTED').length : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScreenHeader
          title="Punch Requests"
          subtitle={waiting > 0 ? `${waiting} waiting for HR` : null}
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
        >
          <PrimaryButton icon="plus" label="Report a missed punch" onPress={openNew} />

          <View style={styles.gap} />

          {load.kind === 'loading' ? (
            <View style={styles.centre}>
              <ActivityIndicator color={C.blue} />
            </View>
          ) : load.kind === 'failed' ? (
            <LeaveState
              icon="cloud-off-outline"
              title="Could not load your requests"
              body={load.message}
              tone="danger"
              onRetry={retry}
            />
          ) : load.items.length === 0 ? (
            <LeaveState
              icon="clock-check-outline"
              title="No requests yet"
              body="Missed a clock in or out? Send HR the time."
            />
          ) : (
            load.items.map((item) => (
              <PunchRequestCard
                key={item.id}
                item={item}
                onWithdraw={() => { void withdraw(item); }}
                withdrawing={withdrawingId === item.id}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

/** The HR header every team screen uses: back left, title centred, one muted line under it. */
const ScreenHeader: React.FC<{ title: string; subtitle?: string | null; onBack: () => void }> = ({
  title,
  subtitle,
  onBack,
}) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
      <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
    </TouchableOpacity>
    <View style={styles.headerText} pointerEvents="none">
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  </View>
);

// ── HR: everyone's punch requests ─────────────────────────────────────

type Filter = 'PENDING' | 'APPROVED' | 'REJECTED';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

type TeamLoad =
  | { kind: 'loading' }
  | { kind: 'ready'; items: TeamPunchRequest[] }
  | { kind: 'failed'; message: string; denied: boolean };

/**
 * HR's queue of forgotten-punch requests from every employee: the same list as the
 * web's Attendance > Daily > Punch Requests, read from the same endpoint, so a
 * request decided in one place is gone from the other. Status stays REQUESTED for
 * the ones waiting.
 *
 * Reading needs ATTENDANCE_WORK_CARD.VIEW. Deciding needs ATTENDANCE_WORK_CARD.EDIT,
 * which useApproverAccess reports as `punchDecide`. Without it the buttons stay
 * hidden and the queue is read-only: a button the server would refuse with 403 is a
 * control that does nothing.
 *
 * Nobody decides their own request. The reworked server refuses it; today's does
 * not, so the buttons are withheld here for HR's own requests either way.
 */
export const PunchApprovalScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { user } = usePayrollAuth();
  const access = useApproverAccess();
  // From the server's rights only: the role-name guess never grants it.
  const canDecide = access.ready && access.punchDecide;
  const myEmployeeId = user?.employeeId ?? null;

  const [filter, setFilter] = useState<Filter>('PENDING');
  const [load, setLoad] = useState<TeamLoad>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const alive = useRef(true);
  // Only the newest read may land: switching chips quickly must not let the
  // Approved list arrive under the Pending chip.
  const ticket = useRef(0);
  const filterRef = useRef<Filter>('PENDING');

  const fetchList = useCallback(async (which: Filter): Promise<string | null> => {
    const mine = ++ticket.current;
    try {
      const items = await attendanceService.getTeamPunchRequests(which === 'PENDING' ? undefined : which);
      if (alive.current && mine === ticket.current) setLoad({ kind: 'ready', items });
      return null;
    } catch (err) {
      const denied = statusOfError(err) === 403;
      const message = denied
        ? serverMessage(err, 'Your role cannot see punch requests.')
        : serverMessage(err, 'Could not load punch requests.');
      if (alive.current && mine === ticket.current) {
        // A list already on screen stays; only a spinner or an earlier failure is replaced.
        setLoad((prev) => (prev.kind === 'ready' && !denied ? prev : { kind: 'failed', message, denied }));
      }
      return message;
    }
  }, []);

  // Re-read on every return to the page, so a request decided on the web in the
  // meantime is not offered again.
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setLoad((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
      void fetchList(filterRef.current);
      return () => {
        alive.current = false;
      };
    }, [fetchList]),
  );

  const choose = (next: Filter) => {
    if (next === filter) return;
    filterRef.current = next;
    setFilter(next);
    setLoad({ kind: 'loading' });
    void fetchList(next);
  };

  const onRefresh = async () => {
    const hadList = load.kind === 'ready';
    setRefreshing(true);
    const failure = await fetchList(filterRef.current);
    if (!alive.current) return;
    setRefreshing(false);
    if (failure && hadList) void dialog.notify({ title: 'Could not refresh', message: failure, tone: 'danger' });
  };

  const retry = () => {
    setLoad({ kind: 'loading' });
    void fetchList(filterRef.current);
  };

  /** Takes the card off at once, then re-reads so the list matches the server. */
  const settle = async (id: string) => {
    if (alive.current) {
      setLoad((prev) => (prev.kind === 'ready' ? { kind: 'ready', items: prev.items.filter((i) => i.id !== id) } : prev));
    }
    await fetchList(filterRef.current);
  };

  const approve = async (item: TeamPunchRequest) => {
    const label = PUNCH_LOOK[item.punchType]?.label ?? 'Punch';
    const who = item.employeeName || 'the employee';
    const ok = await dialog.confirm({
      title: 'Approve this punch?',
      message: `Adds ${label}, ${punchWhenText(item.punchTime)} to ${who}'s work card.`,
      confirmText: 'Approve',
      cancelText: 'Not now',
    });
    if (!ok) return;

    setBusy({ id: item.id, action: 'approve' });
    try {
      await attendanceService.approveTeamPunchRequest(item.id);
      await settle(item.id);
    } catch (err) {
      await dialog.notify({ title: 'Could not approve it', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
      // A refusal usually means someone decided it a moment ago, or the employee withdrew it.
      await fetchList(filterRef.current);
    }
    if (alive.current) setBusy(null);
  };

  const reject = async (item: TeamPunchRequest) => {
    const label = PUNCH_LOOK[item.punchType]?.label ?? 'Punch';
    const reason = await dialog.prompt({
      title: 'Reject this punch?',
      message: `${label} · ${punchWhenText(item.punchTime)}`,
      placeholder: 'Reason the employee will see',
      confirmText: 'Reject',
      cancelText: 'Not now',
      required: true,
      maxLength: 500,
      multiline: true,
      destructive: true,
    });
    if (!reason) return;

    setBusy({ id: item.id, action: 'reject' });
    try {
      await attendanceService.rejectTeamPunchRequest(item.id, reason);
      await settle(item.id);
    } catch (err) {
      await dialog.notify({ title: 'Could not reject it', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
      await fetchList(filterRef.current);
    }
    if (alive.current) setBusy(null);
  };

  const subtitle =
    filter === 'PENDING' && load.kind === 'ready'
      ? load.items.length === 0
        ? 'Nothing waiting'
        : `${load.items.length} waiting for a decision`
      : null;

  const emptyText: Record<Filter, string> = {
    PENDING: 'No punch requests waiting',
    APPROVED: 'No approved punch requests',
    REJECTED: 'No rejected punch requests',
  };

  const renderItem = ({ item }: { item: TeamPunchRequest }) => {
    const own = myEmployeeId !== null && item.employeeId === myEmployeeId;
    const pending = item.status === 'REQUESTED';
    const decide = pending && canDecide && !own;
    return (
      <TeamPunchCard
        item={item}
        // Read-only until deciding on the phone is switched on: the line says where it is done,
        // so the card without buttons does not read as broken.
        footnote={pending ? (own ? 'Your own request' : canDecide ? null : 'Decide on the web') : null}
        busy={busy?.id === item.id ? busy.action : null}
        onApprove={decide ? () => { void approve(item); } : undefined}
        onReject={decide ? () => { void reject(item); } : undefined}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader title="Punch Approval" subtitle={subtitle} onBack={() => navigation.goBack()} />

        {/* A role refused outright has nothing to filter. */}
        {load.kind === 'failed' && load.denied ? null : (
          <View style={styles.chips}>
            <ChipRow items={FILTERS} value={filter} onChange={choose} />
          </View>
        )}

        {load.kind === 'loading' ? (
          <View style={styles.centreFill}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'failed' ? (
          <View style={styles.pad}>
            {load.denied ? (
              // No retry: asking again cannot succeed. The back arrow is the way out.
              <LeaveState icon="lock-outline" title="No access to punch requests" body={load.message} tone="danger" />
            ) : (
              <LeaveState icon="cloud-off-outline" title="Could not load punch requests" body={load.message} tone="danger" onRetry={retry} />
            )}
          </View>
        ) : (
          <FlatList
            data={load.items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            extraData={busy}
            style={styles.flex}
            contentContainerStyle={[styles.list, { paddingBottom: 16 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { void onRefresh(); }} tintColor={C.blue} colors={[C.blue]} />
            }
            ListEmptyComponent={
              <LeaveState icon="clock-check-outline" title={emptyText[filter]} body="Pull down to check again." />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },

  header: { minHeight: 52, paddingHorizontal: 10, justifyContent: 'center', marginBottom: 4 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  centreFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gap: { height: 12 },

  chips: { paddingBottom: 10 },
  pad: { paddingHorizontal: 16 },
  list: { paddingHorizontal: 16, paddingTop: 2, flexGrow: 1 },
});

export default PunchRequestsScreen;
