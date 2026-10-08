/**
 * Claim Approval — the claims waiting on a decision, and the ones already made.
 *
 * Two things were wrong with the screen this replaced. It asked for fifty claims
 * of any status, so approved and rejected ones sat in the queue with dead
 * buttons on them; and it offered Approve and Reject to everyone, because it
 * called the HR endpoints and assumed whoever got there was allowed to.
 *
 * Approving needs CLAIM_APPLICATION.APPROVE, and so does reading the Pending
 * queue — it is every employee's spending. Someone without it gets the locked
 * card below rather than a row of buttons that answer 403.
 *
 * Pending, Approved, Rejected and All, like Leave and Request Approval, so HR
 * can answer "did you approve my taxi claim?" without the web. Pending reads the
 * mobile queue (which leaves out the approver's own claims); the other tabs read
 * the web list, which needs CLAIM_APPLICATION.VIEW and so can be locked on its
 * own while Pending still works.
 *
 * Lists are read a page at a time and the header counts from the server's
 * total: at month end there can be more than one page waiting, and the old
 * "100 waiting" was the page size, not the queue.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import claimService, { ClaimApplication, ClaimPage } from '../api/services/claimService';
import { serverMessage, statusOfError } from '../lib/serverMessage';
import { useDialog } from '../components/ui/AppDialog';
import {
  ClaimApprovalCard,
  ClaimState,
  FilterChips,
  goTo,
  money,
  type StatusFilter,
} from '../components/claims/ClaimUi';

/** One page of a list; the next arrives as the list is scrolled to its end. */
const PAGE_SIZE = 30;

type FilterKey = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

/** Pending first and opened on: it is the only tab with anything to do on it. */
const FILTERS: StatusFilter[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

type Load =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      claims: ClaimApplication[];
      /** Everything in this tab, not just what is loaded. */
      total: number;
      page: number;
      loadingMore: boolean;
      moreFailed: boolean;
    }
  /** The caller may not see this tab. Not a failure — an answer. */
  | { kind: 'locked'; message: string }
  | { kind: 'failed'; message: string };

/** A decision being sent, and which one, so its spinner sits in the button that was pressed. */
type Acting = { id: string; kind: 'approve' | 'reject' } | null;

function query(which: FilterKey, page: number, pageSize: number): Promise<ClaimPage> {
  return which === 'PENDING'
    ? claimService.getPendingApprovals({ page, pageSize })
    : claimService.getAllClaims({ status: which === 'ALL' ? undefined : which, page, pageSize });
}

export const ClaimsApprovalScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user } = usePayrollAuth();
  const myEmployeeId = user?.employeeId ?? null;
  // Punch shows in the bar for anyone linked to an employee record.
  const navSpace = useBottomNavSpace(!!myEmployeeId);
  // The decided tabs read the web list, which needs CLAIM_APPLICATION.VIEW. A role that may
  // decide claims but not browse them gets Pending alone, rather than three chips that each
  // open a locked card. Until the rights are known every chip shows, as before.
  const access = useApproverAccess();
  const filters = access.ready && !access.claimsView ? FILTERS.slice(0, 1) : FILTERS;

  const [filter, setFilter] = useState<FilterKey>('PENDING');
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<Acting>(null);
  /** The Pending chip's count, kept while another tab is open. */
  const [pendingTotal, setPendingTotal] = useState(0);

  /** A reload started after a page was asked for wins over that page. */
  const ticket = useRef(0);
  /** The tab and the pages loaded, readable from the focus reload without re-subscribing it. */
  const filterRef = useRef<FilterKey>('PENDING');
  const pagesRef = useRef(1);
  /**
   * Set from the moment a decision's dialog opens until the decision is back.
   * The dialogs queue, so a double tap on Approve, or Approve here then Reject
   * on the next card, used to stack two dialogs and send a second decision that
   * came back "Claim is already APPROVED".
   */
  const asking = useRef(false);

  useEffect(() => {
    if (load.kind === 'ready') pagesRef.current = load.page;
  }, [load]);

  const isOwn = useCallback(
    (claim: ClaimApplication) => !!myEmployeeId && claim.employeeId === myEmployeeId,
    [myEmployeeId],
  );

  /**
   * Re-reads the tab from the top, as many pages as were loaded, in one call:
   * coming back from a claim or deciding one used to drop someone who had
   * scrolled to page two back to the first thirty rows.
   *
   * `quiet` keeps what is on screen when the read fails. The silent re-read
   * after a decision must not swap a working list for an error page.
   */
  const fetch = useCallback(async (which: FilterKey, pages = 1, quiet = false) => {
    const mine = ++ticket.current;
    try {
      const res = await query(which, 1, Math.max(1, pages) * PAGE_SIZE);
      if (mine !== ticket.current) return;
      // Whole pages only, unless that is everything: if the server ever caps the
      // page size, the next page asked for must start where these rows end.
      const complete = res.items.length >= res.total;
      const keep = complete ? res.items.length : Math.max(PAGE_SIZE, Math.floor(res.items.length / PAGE_SIZE) * PAGE_SIZE);
      const claims = res.items.slice(0, keep);
      if (which === 'PENDING') setPendingTotal(res.total);
      setLoad({
        kind: 'ready',
        claims,
        total: res.total,
        page: Math.max(1, Math.ceil(claims.length / PAGE_SIZE)),
        loadingMore: false,
        moreFailed: false,
      });
    } catch (err) {
      if (mine !== ticket.current || quiet) return;
      const message = serverMessage(err, 'Could not load the claims.');
      setLoad(statusOfError(err) === 403 ? { kind: 'locked', message } : { kind: 'failed', message });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetch(filterRef.current, pagesRef.current);
    }, [fetch]),
  );

  const changeFilter = (key: string) => {
    const next = key as FilterKey;
    if (next === filterRef.current) return;
    filterRef.current = next;
    pagesRef.current = 1;
    setFilter(next);
    setLoad({ kind: 'loading' });
    void fetch(next, 1);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetch(filterRef.current, 1);
    setRefreshing(false);
  };

  /** The spinner comes back while it runs, so a slow retry is visibly happening and cannot be tapped twice. */
  const retry = () => {
    setLoad({ kind: 'loading' });
    void fetch(filterRef.current, 1);
  };

  const loadMore = async () => {
    if (load.kind !== 'ready' || load.loadingMore || load.claims.length >= load.total) return;
    const mine = ticket.current;
    const which = filterRef.current;
    const nextPage = load.page + 1;
    setLoad({ ...load, loadingMore: true, moreFailed: false });
    try {
      const next = await query(which, nextPage, PAGE_SIZE);
      if (mine !== ticket.current) return;
      setLoad((prev) => {
        if (prev.kind !== 'ready') return prev;
        // A claim decided meanwhile shifts every later page up by one row, so a
        // row can turn up on two pages; listed once.
        const seen = new Set(prev.claims.map((c) => c.id));
        return {
          ...prev,
          claims: [...prev.claims, ...next.items.filter((c) => !seen.has(c.id))],
          total: next.total,
          page: nextPage,
          loadingMore: false,
        };
      });
    } catch {
      if (mine !== ticket.current) return;
      setLoad((prev) => (prev.kind === 'ready' ? { ...prev, loadingMore: false, moreFailed: true } : prev));
    }
  };

  /**
   * The row is handed over as a first paint, so the claim opens at once instead
   * of on a spinner; the page still re-reads it before offering any button.
   * Your own claim opens as yours, with Edit and Withdraw, never Approve.
   */
  const openClaim = (claim: ClaimApplication) => {
    goTo(navigation, 'ClaimDetails', { claimId: claim.id, claim, canApprove: !isOwn(claim) });
  };

  /** "Approved · RM 40.00 · Aisyah": the shared toast, so all three approval lists confirm alike. */
  const showToast = (text: string) => dialog.toast(text, 'success');

  /**
   * On success the row leaves the queue at once (or, on All, changes its pill)
   * and a short line says what was done, then the list is re-read quietly. It
   * used to sit with a spinner through a full reload and then vanish without a
   * word, so nobody could tell an approve had gone through.
   *
   * On failure the list is re-read in full: usually another approver got there
   * first or the employee withdrew it, and the row should drop out instead of
   * keeping live buttons that answer the same error again.
   */
  const decide = async (claim: ClaimApplication, kind: 'approve' | 'reject') => {
    if (asking.current || acting) return;
    asking.current = true;
    try {
      const who = claim.employeeName ?? 'the employee';
      let reason: string | null = null;
      if (kind === 'approve') {
        const ok = await dialog.confirm({
          title: 'Approve this claim?',
          message: `${money(claim.amount)} to ${who}. Approving sends it through to payroll.`,
          confirmText: 'Approve',
        });
        if (!ok) return;
      } else {
        reason = await dialog.prompt({
          title: 'Reject this claim',
          message: `${claim.employeeName ?? 'The employee'} sees this, so say what would make it claimable.`,
          placeholder: 'Reason for rejection',
          confirmText: 'Reject',
          required: true,
          multiline: true,
          maxLength: 1000,
          destructive: true,
        });
        if (!reason) return;
      }

      setActing({ id: claim.id, kind });
      try {
        if (kind === 'approve') await claimService.approveClaim(claim.id);
        else await claimService.rejectClaim(claim.id, reason ?? '');
      } catch (err) {
        setActing(null);
        await dialog.notify({
          title: kind === 'approve' ? 'Could not approve' : 'Could not reject',
          message: serverMessage(err, 'Please try again.'),
          tone: 'danger',
        });
        await fetch(filterRef.current, pagesRef.current);
        return;
      }

      const decided = kind === 'approve' ? 'APPROVED' : 'REJECTED';
      setLoad((prev) => {
        if (prev.kind !== 'ready') return prev;
        if (filterRef.current === 'ALL') {
          return {
            ...prev,
            claims: prev.claims.map((c) =>
              c.id === claim.id ? { ...c, status: decided, approvedAt: new Date().toISOString() } : c,
            ),
          };
        }
        return { ...prev, claims: prev.claims.filter((c) => c.id !== claim.id), total: Math.max(prev.total - 1, 0) };
      });
      setPendingTotal((n) => Math.max(n - 1, 0));
      setActing(null);
      showToast(`${kind === 'approve' ? 'Approved' : 'Rejected'} · ${money(claim.amount)} · ${claim.employeeName ?? 'Employee'}`);
      void fetch(filterRef.current, pagesRef.current, true);
    } finally {
      asking.current = false;
    }
  };

  const ready = load.kind === 'ready' ? load : null;
  const claims = ready?.claims ?? [];
  /** The money total is only said when every waiting claim is loaded; a part-sum would read as the whole. */
  const allLoaded = ready !== null && claims.length >= ready.total;
  const loadedSum = claims.reduce((sum, c) => sum + c.amount, 0);

  const subtitle = !ready
    ? 'Claims to decide'
    : filter === 'PENDING'
      ? ready.total === 0
        ? 'Nothing waiting'
        : allLoaded
          ? `${ready.total} waiting · ${money(loadedSum)}`
          : `${ready.total} waiting`
      : filter === 'APPROVED'
        ? `${ready.total} approved`
        : filter === 'REJECTED'
          ? `${ready.total} rejected`
          : `${ready.total} ${ready.total === 1 ? 'claim' : 'claims'}`;

  const renderRow = ({ item }: { item: ClaimApplication }) => (
    <ClaimApprovalCard
      claim={item}
      onPress={() => openClaim(item)}
      showStatus={filter !== 'PENDING'}
      own={isOwn(item)}
      onApprove={() => { void decide(item, 'approve'); }}
      onReject={() => { void decide(item, 'reject'); }}
      busy={acting && acting.id === item.id ? acting.kind : null}
      disabled={acting !== null}
    />
  );

  const footer = !ready || claims.length === 0 ? null : ready.loadingMore ? (
    <View style={styles.more}>
      <ActivityIndicator size="small" color={C.blue} />
    </View>
  ) : ready.moreFailed ? (
    <TouchableOpacity style={styles.more} onPress={() => { void loadMore(); }} accessibilityRole="button">
      <Text style={styles.moreFailedText}>Could not load more. Tap to try again.</Text>
    </TouchableOpacity>
  ) : null;

  const empty =
    filter === 'PENDING' ? (
      <ClaimState
        icon="check-circle-outline"
        title="Nothing waiting"
        body="All caught up."
        actionLabel={filters.length > 1 ? 'See approved' : undefined}
        onAction={filters.length > 1 ? () => changeFilter('APPROVED') : undefined}
      />
    ) : (
      <ClaimState
        icon="receipt"
        title={filter === 'APPROVED' ? 'No approved claims' : filter === 'REJECTED' ? 'No rejected claims' : 'No claims yet'}
      />
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>Claim Approval</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{subtitle}</Text>
          </View>
        </View>

        {/* One chip alone would be a control that does nothing. */}
        {filters.length > 1 ? (
          <View style={styles.chips}>
            <FilterChips
              filters={filters}
              active={filter}
              counts={{ PENDING: pendingTotal }}
              onChange={changeFilter}
              inset={16}
            />
          </View>
        ) : null}

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'locked' ? (
          <View style={[styles.centre, { paddingBottom: navSpace }]}>
            {filter === 'PENDING' ? (
              <ClaimState
                icon="lock-outline"
                title="Not yours to decide"
                body={`${load.message} Ask whoever runs payroll for the claim approval right.`}
                actionLabel="Go back"
                onAction={() => navigation.goBack()}
              />
            ) : (
              <ClaimState
                icon="lock-outline"
                title="Past claims are not open to you"
                body="Your role can decide claims but not browse decided ones."
                actionLabel="Back to Pending"
                onAction={() => changeFilter('PENDING')}
              />
            )}
          </View>
        ) : load.kind === 'failed' ? (
          <View style={[styles.centre, { paddingBottom: navSpace }]}>
            <ClaimState
              icon="cloud-off-outline"
              title="Could not load the claims"
              body={load.message}
              tone="danger"
              actionLabel="Try again"
              onAction={retry}
            />
          </View>
        ) : (
          <FlatList
            data={claims}
            keyExtractor={(c) => c.id}
            renderItem={renderRow}
            extraData={acting}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: navSpace + 16 },
              // The empty state sits in the middle of the screen, not in its top third.
              claims.length === 0 && styles.listEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            onEndReached={() => { void loadMore(); }}
            onEndReachedThreshold={0.4}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={empty}
            ListFooterComponent={footer}
          />
        )}
      </SafeAreaView>

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, left: 64, right: 64, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.muted, marginTop: 1 },

  chips: { paddingHorizontal: 16, marginBottom: 10 },

  list: { paddingHorizontal: 16, paddingTop: 2, gap: 10 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreFailedText: { fontSize: 13, fontWeight: '600', color: C.danger },
});

export default ClaimsApprovalScreen;
