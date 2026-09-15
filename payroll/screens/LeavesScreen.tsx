/**
 * Leave Approval — the queue of leave applications waiting on whoever can decide them.
 *
 * The one job of this page is triage: an approver should be able to work down
 * the list and know, without opening a single row, who asked, for what, for how
 * long, and how long it has already sat here. So every card carries the whole
 * question — applicant, leave type, the dates and the day count, when it was
 * submitted, whether a file is attached — and the row opens only when the
 * reason needs reading.
 *
 * The failure state is the reason this screen was rewritten. It used to swallow
 * the error in a console.error and fall through to "no leave applications
 * found", so an approver hitting an outage was told the queue was empty, closed
 * the app, and left real leave unactioned. Loading, failed and empty are now
 * three different answers, and the failed one says what went wrong and offers a
 * way to try again — the same shape My Leaves, Leave Type and Leave History use.
 */

import React, { useCallback, useState } from 'react';
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
import { BottomNavBar, BOTTOM_NAV_HEIGHT } from '../components/BottomNavBar';
import { useDialog } from '../components/ui/AppDialog';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { STATUSES } from '../constants/statuses';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import { StatusPill, parseDate, shortDate } from '../components/requests/RequestUi';
import {
  LeaveState,
  dateRangeText,
  dayText,
  goTo,
  leaveIcon,
  leaveTint,
  leaveWash,
} from '../components/leave/LeaveUi';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: STATUSES.PENDING, label: 'Pending' },
  { key: STATUSES.APPROVED, label: 'Approved' },
  { key: STATUSES.REJECTED, label: 'Rejected' },
  { key: STATUSES.CANCELLED, label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; leaves: LeaveApplication[] }
  | { kind: 'failed'; message: string };

/** Two letters for the avatar disc. A face is not available here; a name always is. */
function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * How long an application has sat unanswered.
 *
 * The number an approver triages on: a leave submitted this morning and one
 * that has waited a week look identical without it, and the week-old one is
 * probably for dates that have already started.
 */
function waitedFor(createdAt: string | null | undefined): { text: string; days: number } | null {
  const d = parseDate(createdAt);
  if (!d) return null;
  const ms = Date.now() - d.getTime();
  if (ms < 0) return { text: 'Just submitted', days: 0 };
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return { text: 'Just submitted', days: 0 };
  if (hours < 24) return { text: `Waiting ${hours} ${hours === 1 ? 'hour' : 'hours'}`, days: 0 };
  const days = Math.floor(hours / 24);
  return { text: `Waiting ${days} ${days === 1 ? 'day' : 'days'}`, days };
}

/**
 * The shared status pill has no Withdrawn look and falls back to Pending, which
 * on a leave the employee took back would put it in the approver's way again.
 * HR's view has always called those cancelled; the true word is printed on the
 * badge line underneath so nothing is lost.
 */
function pillStatus(status: string): string {
  return status === STATUSES.WITHDRAWN ? STATUSES.CANCELLED : status;
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
  // Everyone's leave, for whoever holds the leave approval right (useApproverAccess).
  const isHR = useApproverAccess().leave;
  // Department approvers see the leave of their departments; they may decide only what is
  // waiting on them right now, not a leave their step already passed on to HR.
  const [waitingOnMe, setWaitingOnMe] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<FilterKey>('ALL');
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    try {
      if (!isHR) {
        leaveService
          .getPendingApprovals({ page: 1, pageSize: 200 })
          .then((r) => setWaitingOnMe(new Set((r?.items ?? []).map((l) => l.id))))
          .catch(() => setWaitingOnMe(new Set()));
      }
      const fetchFn = isHR
        ? leaveService.getAllLeaveApplications.bind(leaveService)
        : leaveService.getApproverLeaves.bind(leaveService);

      if (activeTab === STATUSES.CANCELLED) {
        // Cancelled tab: show both CANCELLED and WITHDRAWN leaves
        const [cancelled, withdrawn] = await Promise.all([
          fetchFn({ page: 1, pageSize: 50, status: STATUSES.CANCELLED }),
          fetchFn({ page: 1, pageSize: 50, status: STATUSES.WITHDRAWN }),
        ]);
        setLoad({ kind: 'ready', leaves: [...(cancelled.items || []), ...(withdrawn.items || [])] });
      } else {
        const status = activeTab === 'ALL' ? undefined : activeTab;
        const result = await fetchFn({ page: 1, pageSize: 50, status });
        setLoad({ kind: 'ready', leaves: result.items || [] });
      }
    } catch (err) {
      // The whole point of the rewrite: an outage now reads as an outage, not
      // as an empty queue.
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load the approval queue.') });
    }
  }, [activeTab, isHR]);

  // On focus rather than on mount, so deciding a leave on the detail screen and
  // coming back does not leave the queue showing the row you just cleared.
  useFocusEffect(
    useCallback(() => {
      setLoad({ kind: 'loading' });
      void fetchLeaves();
    }, [fetchLeaves]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaves();
    setRefreshing(false);
  }, [fetchLeaves]);

  const openLeave = (leave: LeaveApplication) => {
    goTo(navigation, 'LeaveDetails', { leaveId: leave.id, canApprove: true });
  };

  const approve = async (leave: LeaveApplication) => {
    const ok = await dialog.confirm({
      title: 'Approve this leave?',
      message: `${leave.employeeName || 'The employee'} is told straight away, and the days come off their balance.`,
      confirmText: 'Approve',
    });
    if (!ok) return;

    setActingOn(leave.id);
    try {
      await leaveService.approveLeave(leave.id);
      await fetchLeaves();
    } catch (err) {
      await dialog.notify({
        title: 'Could not approve',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    } finally {
      setActingOn(null);
    }
  };

  const reject = async (leave: LeaveApplication) => {
    // Alert.prompt is iOS-only and returns void. The old code called it optionally and
    // then OR-ed the result, so Android skipped the prompt entirely and showed only a
    // useless second box -- rejecting a leave from this list was impossible -- while iOS
    // got both boxes stacked. RequestsScreen already solved this with dialog.prompt.
    const reason = await dialog.prompt({
      title: 'Reject this leave',
      message: 'The employee sees this, so say what would make it approvable.',
      placeholder: 'Reason for rejection',
      confirmText: 'Reject',
      required: true,
      multiline: true,
      maxLength: 1000,
      destructive: true,
    });
    if (!reason) return;

    setActingOn(leave.id);
    try {
      await leaveService.rejectLeave(leave.id, reason);
      await fetchLeaves();
    } catch (err) {
      await dialog.notify({
        title: 'Could not reject',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    } finally {
      setActingOn(null);
    }
  };

  const leaves = load.kind === 'ready' ? load.leaves : [];

  const subtitle = (() => {
    if (load.kind === 'failed') return 'The queue could not be read';
    if (load.kind === 'loading') return 'Leave waiting on a decision';
    const n = leaves.length;
    if (activeTab === STATUSES.PENDING) {
      return n === 0 ? 'Nothing waiting on you' : `${n} waiting on you`;
    }
    return `${n} ${n === 1 ? 'application' : 'applications'}`;
  })();

  const renderCard = ({ item }: { item: LeaveApplication }) => {
    const busy = actingOn === item.id;
    const tint = leaveTint({ color: item.leaveTypeColor, code: item.leaveTypeCode });
    const pending = item.status === STATUSES.PENDING;
    const waited = pending ? waitedFor(item.createdAt) : null;
    // Three days is the point where the dates being asked for start to arrive.
    const overdue = waited !== null && waited.days >= 3;
    const where = [item.employeeCode, item.employeeDepartment].filter(Boolean).join(' · ');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openLeave(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${item.employeeName || 'Employee'}, ${item.leaveTypeDescription || 'leave'}, ${dateRangeText(item.startDate, item.endDate)}`}
      >
        <View style={styles.who}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.employeeName)}</Text>
          </View>
          <View style={styles.whoText}>
            <Text style={styles.name} numberOfLines={1}>{item.employeeName || 'Employee'}</Text>
            {where ? <Text style={styles.sub} numberOfLines={1}>{where}</Text> : null}
          </View>
          <StatusPill status={pillStatus(item.status)} />
        </View>

        <View style={styles.what}>
          <View style={[styles.typeIcon, { backgroundColor: leaveWash(tint) }]}>
            <MaterialCommunityIcons name={leaveIcon(item.leaveTypeCode)} size={20} color={tint} />
          </View>
          <View style={styles.whatText}>
            <Text style={styles.type} numberOfLines={1}>{item.leaveTypeDescription || 'Leave'}</Text>
            <Text style={styles.dates} numberOfLines={1}>
              {dateRangeText(item.startDate, item.endDate)} · {dayText(item.totalDays)}
            </Text>
          </View>
        </View>

        {item.reason ? <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text> : null}

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="calendar-arrow-right" size={13} color={C.body} />
            <Text style={styles.badgeText}>Applied {shortDate(item.createdAt)}</Text>
          </View>

          {waited ? (
            <View style={[styles.badge, overdue && styles.badgeWarn]}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={overdue ? '#B45309' : C.body} />
              <Text style={[styles.badgeText, overdue && styles.badgeWarnText]}>{waited.text}</Text>
            </View>
          ) : null}

          {item.attachmentFileName ? (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="paperclip" size={13} color={C.body} />
              <Text style={styles.badgeText} numberOfLines={1}>Attachment</Text>
            </View>
          ) : null}

          {item.totalApprovalSteps > 1 ? (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="account-multiple-check-outline" size={13} color={C.body} />
              <Text style={styles.badgeText}>
                Step {item.currentApprovalStep} of {item.totalApprovalSteps}
              </Text>
            </View>
          ) : null}

          {item.status === STATUSES.WITHDRAWN ? (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="undo-variant" size={13} color={C.body} />
              <Text style={styles.badgeText}>Withdrawn by the employee</Text>
            </View>
          ) : null}
        </View>

        {pending && (isHR || waitingOnMe.has(item.id)) ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.action, styles.rejectAction]}
              onPress={() => { void reject(item); }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Reject ${item.employeeName || 'this'} leave`}
            >
              <MaterialCommunityIcons name="close" size={16} color={C.danger} />
              <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.action, styles.approveAction]}
              onPress={() => { void approve(item); }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Approve ${item.employeeName || 'this'} leave`}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionText, styles.approveText]}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const activeLabel = FILTERS.find((f) => f.key === activeTab)?.label.toLowerCase() ?? 'this';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Leave Approval</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>

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
            body={`${load.message} Leave still waiting is not shown until this loads, so try again before closing the app.`}
            tone="danger"
            onRetry={() => { void onRefresh(); }}
          />
        ) : (
          <FlatList
            data={leaves}
            keyExtractor={(l) => l.id}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
            }
            ListEmptyComponent={
              <LeaveState
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

      <BottomNavBar activeScreen="leave" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 12, paddingTop: 4, minHeight: 56, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { position: 'absolute', left: 76, right: 76, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  chipStrip: { flexGrow: 0, maxHeight: 60 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 13, fontWeight: '700', color: '#3B4A63' },
  chipTextActive: { color: '#FFFFFF' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: BOTTOM_NAV_HEIGHT + 24, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D8E6FB', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.blue },
  whoText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: C.ink },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },

  what: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  typeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  whatText: { flex: 1 },
  type: { fontSize: 14, fontWeight: '700', color: C.ink },
  dates: { fontSize: 13, color: C.body, marginTop: 2 },

  reason: { fontSize: 13, lineHeight: 19, color: C.body, marginTop: 12 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2F7',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: C.body },
  badgeWarn: { backgroundColor: '#FFF4E5' },
  badgeWarnText: { color: '#B45309', fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 14 },
  rejectAction: { borderWidth: 1, borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  approveAction: { backgroundColor: C.blue },
  actionText: { fontSize: 14, fontWeight: '700' },
  rejectText: { color: C.danger },
  approveText: { color: '#FFFFFF' },
});

export default LeavesScreen;
