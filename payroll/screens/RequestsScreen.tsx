/**
 * Request Approval
 * Every employee request in the company, for whoever can decide them. Approving
 * and rejecting happen here for speed; anything that needs reading — the notes,
 * the attached files, HR's reply — opens the detail screen.
 *
 * Each tab asks the server for its own status, a page at a time. This used to
 * load the newest 100 of everything and filter on the phone, so once a company
 * passed 100 requests the older pending ones fell off the Pending tab.
 *
 * The card is the approval card Leave and Claims Approval use too: who, what,
 * the note, how long it has waited, then Reject / Approve. The owner rejected
 * the older one-line card with a "Pending" pill repeated on every row.
 *
 * An approver who is also an employee never sees their own requests on the
 * Pending tab: nobody decides their own request, the server refuses it anyway,
 * and the Home tile's count already leaves them out. They still appear under
 * Approved, Rejected and All, marked "(you)" and without buttons.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { BottomNavBar, useBottomNavSpace } from '../components/BottomNavBar';
import { useDialog } from '../components/ui/AppDialog';
import { ApprovalPerson, DecisionButtons } from '../components/ui/ApprovalCard';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import requestService, { EmployeeRequest } from '../api/services/requestService';
import { serverMessage } from '../lib/serverMessage';
import {
  CARD_SURFACE,
  ErrorBanner,
  ListState,
  RequestHeader,
  StatusPill,
  dayMonth,
  requestError,
  requestTypeColor,
  shortDate,
  statusOf,
  waitingLabel,
  type RequestStatus,
} from '../components/requests/RequestUi';

// Four chips fit a 390pt phone without scrolling; five cut "Cancelled" off at
// the edge. Cancelled requests are still listed under All: HR never acts on
// them, so they do not need a tab of their own.
const FILTERS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];
type Decision = 'approve' | 'reject';

const PAGE_SIZE = 30;

function typeName(r: EmployeeRequest): string {
  return r.requestTypeName || r.requestType || 'Request';
}

/** "Equipment" rather than "Equipment Request", so "…'s Equipment request?" never says it twice. */
function typeForSentence(r: EmployeeRequest): string {
  return typeName(r).replace(/\s+request$/i, '');
}

const DONE_VERB: Partial<Record<RequestStatus, string>> = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  WITHDRAWN: 'withdrawn',
};

/** "Applied 4 Sep · waiting 34 days" while it waits; what happened to it and when, once it has not. */
function metaLine(r: EmployeeRequest): string {
  const applied = `Applied ${dayMonth(r.createdAt)}`;
  const status = statusOf(r.status);
  if (status === 'PENDING') {
    const waiting = waitingLabel(r.createdAt);
    return waiting ? `${applied} · ${waiting}` : applied;
  }
  const verb = DONE_VERB[status];
  // A cancel is the employee's, so it is not a review: its date is the row's last change.
  const when = status === 'CANCELLED' || status === 'WITHDRAWN' ? r.updatedAt : r.reviewedAt;
  return verb && when ? `${applied} · ${verb} ${dayMonth(when)}` : applied;
}

export const RequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user } = usePayrollAuth();
  const myEmployeeId = user?.employeeId ?? null;
  // Punch shows in the bar for anyone linked to an employee record.
  const navSpace = useBottomNavSpace(!!myEmployeeId);

  const [filter, setFilter] = useState<FilterKey>('PENDING');
  const [requests, setRequests] = useState<EmployeeRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Which card is being decided and how, so a reject spins Reject, not Approve.
  const [acting, setActing] = useState<{ id: string; kind: Decision } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Switching tabs quickly can land an older tab's answer after the newer one;
  // each load takes a ticket and only the latest may write.
  const ticketRef = useRef(0);
  const actingRef = useRef(false);
  // How many of the server's rows the loaded pages cover. On Pending that is not
  // the number on screen, because the approver's own are dropped, and "is there
  // more" has to be judged by the server's rows or a page holding nothing but
  // their own would never be followed by the next.
  const rawLoadedRef = useRef(0);
  // Rows decided here since the last page arrived. Each one leaves the server's
  // Pending list, so the next page now starts that many rows later than it did.
  const decidedRef = useRef(0);
  // True once the server's own pending count has arrived; until then (or if it
  // fails) the Pending tab's total stands in for it.
  const serverCountRef = useRef(false);

  const isOwn = useCallback(
    (r: EmployeeRequest) => !!myEmployeeId && r.employeeId === myEmployeeId,
    [myEmployeeId],
  );

  const fetchPage = useCallback(
    (which: FilterKey, pageNo: number) =>
      requestService.getAllRequests({
        status: which === 'ALL' ? undefined : which,
        page: pageNo,
        pageSize: PAGE_SIZE,
        // Longest-waiting first, and the approver's own left out, once the server
        // reads these; the live one ignores both and the filter below still drops
        // their own rows.
        ...(which === 'PENDING' ? { sort: 'oldest' as const, excludeOwn: true } : {}),
      }),
    [],
  );

  const shown = useCallback(
    (which: FilterKey, rows: EmployeeRequest[]) => (which === 'PENDING' ? rows.filter((r) => !isOwn(r)) : rows),
    [isOwn],
  );

  /** The same number as the Home tile: pending and not the approver's own. */
  const loadCount = useCallback(async () => {
    try {
      const n = await requestService.getPendingApprovalCount();
      serverCountRef.current = true;
      setPendingCount(n);
    } catch {
      serverCountRef.current = false;
    }
  }, []);

  const load = useCallback(async (which: FilterKey) => {
    const ticket = ++ticketRef.current;
    setError(null);
    try {
      const result = await fetchPage(which, 1);
      if (ticket !== ticketRef.current) return;
      const raw = result.items ?? [];
      const rows = shown(which, raw);
      const count = typeof result.total === 'number' ? result.total : raw.length;
      rawLoadedRef.current = raw.length;
      decidedRef.current = 0;
      setRequests(rows);
      setTotal(count);
      setPage(1);
      if (which === 'PENDING' && !serverCountRef.current) {
        setPendingCount(Math.max(count - (raw.length - rows.length), 0));
      }
    } catch (err) {
      if (ticket !== ticketRef.current) return;
      setRequests((prev) => prev ?? []);
      setError(requestError(err, 'Could not load requests.'));
    }
  }, [fetchPage, shown]);

  // The count once per visit, not per tab: it does not change with the tab, and
  // every extra call brings the API's rate limit closer.
  useFocusEffect(
    useCallback(() => {
      void loadCount();
    }, [loadCount]),
  );

  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [load, filter]),
  );

  const changeFilter = (key: FilterKey) => {
    if (key === filter) return;
    setRequests(null);
    setFilter(key);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(filter), loadCount()]);
    setRefreshing(false);
  };

  const retry = () => {
    setRequests(null);
    void load(filter);
  };

  const loadMore = async () => {
    // Not after a failure: onEndReached fires again on every scroll, and a
    // failing page asked for in a loop is how the API's rate limit gets hit.
    if (loadingMore || error || !requests || rawLoadedRef.current >= total) return;
    const ticket = ticketRef.current;
    const which = filter;
    const next = page + 1;
    // Rows decided here have left the server's Pending list, so the rows that
    // headed the next page have slid back into the pages already loaded. Asking
    // for those again with the next one catches them; duplicates drop out below.
    const back = which === 'PENDING' ? Math.ceil(decidedRef.current / PAGE_SIZE) : 0;
    const pages: number[] = [];
    for (let p = Math.max(next - back, 1); p <= next; p += 1) pages.push(p);
    setLoadingMore(true);
    try {
      const results = await Promise.all(pages.map((p) => fetchPage(which, p)));
      if (ticket !== ticketRef.current) return;
      const last = results[results.length - 1];
      const raw = results.flatMap((r) => r.items ?? []);
      setRequests((prev) => {
        const list = prev ?? [];
        const seen = new Set(list.map((r) => r.id));
        return [...list, ...shown(which, raw).filter((r) => !seen.has(r.id))];
      });
      rawLoadedRef.current = (next - 1) * PAGE_SIZE + (last.items ?? []).length;
      decidedRef.current = 0;
      setPage(next);
      if (typeof last.total === 'number') setTotal(last.total);
    } catch (err) {
      if (ticket === ticketRef.current) setError(requestError(err, 'Could not load more requests.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = (request: EmployeeRequest) => {
    // Their own request opens as the employee sees it: their files, their
    // reply, Cancel — never Approve.
    navigation.navigate('RequestDetails', { requestId: request.id, canApprove: !isOwn(request) });
  };

  // A short "Approved · Ahmad – Equipment" after each decision: the card just vanishing left HR
  // unsure which one they had tapped. The shared toast, so all three approval lists say it alike.
  const showDone = (text: string) => dialog.toast(text, 'success');

  /**
   * The decided card changes in place. Reloading page 1 after every decision
   * shrank a scrolled list back to 30 rows and jumped the scroll; the next visit
   * or pull-to-refresh corrects any drift instead.
   */
  const settle = (request: EmployeeRequest, kind: Decision, ticket: number) => {
    const next = kind === 'approve' ? 'APPROVED' : 'REJECTED';
    setPendingCount((n) => (n == null ? n : Math.max(n - 1, 0)));
    showDone(`${kind === 'approve' ? 'Approved' : 'Rejected'} · ${request.employeeName ?? 'Employee'} – ${typeName(request)}`);
    // Another tab took over while this was in flight; its own load is current.
    if (ticket !== ticketRef.current) return;
    if (filter === 'PENDING') {
      setRequests((prev) => prev?.filter((r) => r.id !== request.id) ?? prev);
      setTotal((t) => Math.max(t - 1, 0));
      rawLoadedRef.current = Math.max(rawLoadedRef.current - 1, 0);
      decidedRef.current += 1;
    } else {
      const now = new Date().toISOString();
      setRequests((prev) => prev?.map((r) => (r.id === request.id ? { ...r, status: next, reviewedAt: now } : r)) ?? prev);
    }
  };

  // The ref is taken before the dialog opens: a second tap lands before any
  // state update does, and would otherwise open a second dialog.
  const approve = async (request: EmployeeRequest) => {
    if (actingRef.current) return;
    actingRef.current = true;
    try {
      const ok = await dialog.confirm({
        // Named by type as well as person: with three requests from one person,
        // "Approve this request?" did not say which one was tapped.
        title: request.employeeName
          ? `Approve ${request.employeeName}'s ${typeForSentence(request)} request?`
          : `Approve this ${typeForSentence(request)} request?`,
        message: `${request.employeeName ?? 'The employee'} will be told straight away.`,
        confirmText: 'Approve',
      });
      if (!ok) return;

      const ticket = ticketRef.current;
      setActing({ id: request.id, kind: 'approve' });
      try {
        await requestService.approveRequest(request.id);
        settle(request, 'approve', ticket);
      } catch (err) {
        await dialog.notify({ title: 'Could not approve', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        // Most often someone else decided it first; show what it is now.
        await Promise.all([load(filter), loadCount()]);
      }
    } finally {
      actingRef.current = false;
      setActing(null);
    }
  };

  const reject = async (request: EmployeeRequest) => {
    if (actingRef.current) return;
    actingRef.current = true;
    try {
      // Alert.prompt used to be the way in; it exists only on iOS, so rejecting
      // from this list did nothing at all on Android.
      const reason = await dialog.prompt({
        title: request.employeeName
          ? `Reject ${request.employeeName}'s ${typeForSentence(request)} request`
          : `Reject this ${typeForSentence(request)} request`,
        message: `${request.employeeName ?? 'The employee'} sees this, so say what would make it approvable.`,
        placeholder: 'Reason for rejection',
        confirmText: 'Reject',
        required: true,
        multiline: true,
        maxLength: 1000,
        destructive: true,
      });
      if (!reason) return;

      const ticket = ticketRef.current;
      setActing({ id: request.id, kind: 'reject' });
      try {
        await requestService.rejectRequest(request.id, reason);
        settle(request, 'reject', ticket);
      } catch (err) {
        await dialog.notify({ title: 'Could not reject', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        await Promise.all([load(filter), loadCount()]);
      }
    } finally {
      actingRef.current = false;
      setActing(null);
    }
  };

  const renderCard = ({ item }: { item: EmployeeRequest }) => {
    const own = isOwn(item);
    const pending = statusOf(item.status) === 'PENDING';
    const files = item.attachmentCount ?? 0;
    const type = typeName(item);
    const withActions = pending && !own;
    // While one decision is in flight every other button is visibly off, rather
    // than looking ready and swallowing the tap.
    const locked = !!acting;

    return (
      <View style={styles.card}>
        {/* Everything but the buttons opens the request. The buttons sit outside
            this so VoiceOver reaches each one; nested inside a touchable card,
            iOS read the card as one element and hid them. */}
        <Pressable
          onPress={() => openDetail(item)}
          style={({ pressed }) => [styles.cardBody, withActions && styles.cardBodyAbove, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${item.employeeName ?? 'Employee'}${own ? ' (you)' : ''}, ${type}, applied ${shortDate(item.createdAt)}`}
        >
          {/* On Pending every row is pending; a badge there only repeats the tab. */}
          <ApprovalPerson
            name={item.employeeName ?? 'Employee'}
            code={item.employeeCode}
            own={own}
            right={filter !== 'PENDING' ? <StatusPill status={item.status} /> : null}
          />

          <View style={styles.typeRow}>
            <View style={[styles.typeDot, { backgroundColor: requestTypeColor(item.requestTypeId || type) }]} />
            <Text style={styles.typeText} numberOfLines={1}>{type}</Text>
          </View>

          {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}

          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>{metaLine(item)}</Text>
            {files > 0 ? (
              <View style={styles.metaTag} accessibilityLabel={`${files} ${files === 1 ? 'file' : 'files'}`}>
                <MaterialCommunityIcons name="paperclip" size={13} color={C.muted} />
                <Text style={styles.metaTagText}>{files}</Text>
              </View>
            ) : null}
            {item.hrReply ? (
              <View style={styles.metaTag} accessibilityLabel="Replied">
                <MaterialCommunityIcons name="message-text-outline" size={13} color={C.muted} />
                <Text style={styles.metaTagText}>Replied</Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        {withActions ? (
          <View style={styles.actions}>
            <DecisionButtons
              onReject={() => { void reject(item); }}
              onApprove={() => { void approve(item); }}
              acting={acting?.id === item.id ? acting.kind : null}
              disabled={locked}
              name={item.employeeName ?? undefined}
              subject={`${typeForSentence(item)} request`}
            />
          </View>
        ) : null}
      </View>
    );
  };

  const filterLabel = FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? '';
  const empty = (requests ?? []).length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <RequestHeader
          title="Request Approval"
          onBack={() => navigation.goBack()}
          right={
            // An approver linked to an employee files requests too: their own
            // are one tap away, whichever way they came in.
            myEmployeeId ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('MyRequests', undefined, { pop: true })}
                style={styles.mine}
                accessibilityRole="button"
                accessibilityLabel="My own requests"
                hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
              >
                <MaterialCommunityIcons name="account-outline" size={16} color={C.body} />
                <Text style={styles.mineText} maxFontSizeMultiplier={1.3}>Mine</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          style={styles.filterStrip}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const active = filter === item.key;
            // Only Pending carries a number: it is the one that asks for action,
            // and it is the server's count, the same as the Home tile's.
            const n = item.key === 'PENDING' ? pendingCount ?? 0 : 0;
            return (
              <TouchableOpacity
                onPress={() => changeFilter(item.key)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={n > 0 ? `${item.label}, ${n} waiting` : item.label}
                hitSlop={{ top: 5, bottom: 5 }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]} maxFontSizeMultiplier={1.3}>
                  {item.label}
                </Text>
                {n > 0 ? (
                  <View style={[styles.chipCount, active && styles.chipCountActive]}>
                    <Text style={[styles.chipCountText, active && styles.chipCountTextActive]} maxFontSizeMultiplier={1.3}>
                      {n}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />

        {error && !empty ? <ErrorBanner message={error} onRetry={() => { void load(filter); }} /> : null}

        {requests === null ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : (
          <View style={styles.flex}>
            <FlatList
              data={requests}
              keyExtractor={(r) => r.id}
              renderItem={renderCard}
              // An empty or failed list sits in the middle of the free space rather
              // than under the chips with half the screen blank below it.
              contentContainerStyle={[styles.list, { paddingBottom: navSpace + 16 }, empty && styles.listEmpty]}
              showsVerticalScrollIndicator={false}
              onEndReached={() => { void loadMore(); }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.more} color={C.blue} /> : null}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
              ListEmptyComponent={
                error ? (
                  <ListState
                    icon="wifi-off"
                    tone="danger"
                    title="Could not load requests"
                    body={error}
                    actionLabel="Try again"
                    onAction={retry}
                  />
                ) : filter === 'PENDING' ? (
                  <ListState icon="check-all" title="Nothing waiting" body="Every request has been decided." />
                ) : (
                  <ListState icon="inbox-outline" title={filter === 'ALL' ? 'No requests yet' : `No ${filterLabel} requests`} />
                )
              }
            />

          </View>
        )}
      </SafeAreaView>

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },

  mine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
  },
  mineText: { fontSize: 13, fontWeight: '600', color: C.ink },

  filterStrip: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 13, fontWeight: '600', color: C.body },
  chipTextActive: { color: '#FFFFFF' },
  chipCount: { minWidth: 20, paddingHorizontal: 5, height: 20, borderRadius: 10, backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center' },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 11, fontWeight: '700', color: C.ink },
  chipCountTextActive: { color: '#FFFFFF' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 2, gap: 10 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  more: { marginVertical: 12 },

  card: { ...CARD_SURFACE },
  cardBody: { padding: 14 },
  cardBodyAbove: { paddingBottom: 12 },
  pressed: { opacity: 0.7 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
  notes: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 6 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  meta: { flexShrink: 1, fontSize: 12, color: C.muted },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTagText: { fontSize: 12, fontWeight: '600', color: C.body },

  actions: { paddingHorizontal: 14, paddingBottom: 14 },
});

export default RequestsScreen;
