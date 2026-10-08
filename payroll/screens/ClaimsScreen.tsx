/**
 * My Claims — what the employee has claimed, and what they still can.
 *
 * Two questions, in the order people ask them. "How much have I got left?" is
 * answered by the allowance panel at the top; "did my claim go through?" by the
 * list under it. The allowance was already on the server (/claim/balance) and no
 * screen showed it, so the only way to find out you had run out was to submit
 * and be rejected.
 *
 * Filling in a claim is deliberately not here — it is a different job with its
 * own screen.
 *
 * The status filter is asked of the server, a page at a time. Filtering one
 * fetched page of 100 on the phone lost every claim after the hundredth, and
 * the counts on the chips only counted what happened to be loaded.
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import claimService, { ClaimApplication, ClaimBalance, ClaimPage } from '../api/services/claimService';
import { serverMessage, statusOfError } from '../lib/serverMessage';
import {
  BalanceRow,
  CLAIM_FILTERS,
  ClaimCard,
  ClaimState,
  FilterChips,
  SectionHeading,
  goTo,
  money,
  statusOf,
} from '../components/claims/ClaimUi';

/** How many allowance rows to show before the panel needs opening. */
const BALANCES_SHOWN = 2;

/** One page of claims; the next arrives as the list is scrolled to its end. */
const PAGE_SIZE = 30;

/** The list's side gutter. The filter strip bleeds through it to the screen edge. */
const GUTTER = 16;

const FAB_HEIGHT = 52;

type Waiting = { count: number; total: number };

type Ready = {
  kind: 'ready';
  balances: ClaimBalance[];
  /** Null when it could not be worked out; the header then says less. */
  waiting: Waiting | null;
  claims: ClaimApplication[];
  total: number;
  page: number;
  /** Only the list is reloading, because the filter changed. */
  listBusy: boolean;
  listError: string | null;
  loadingMore: boolean;
  moreFailed: boolean;
};

type Load =
  | { kind: 'loading' }
  | Ready
  /** Not linked to an employee in this company. An answer, not a failure. */
  | { kind: 'locked'; message: string }
  | { kind: 'failed'; message: string };

const statusParam = (key: string) => (key === 'ALL' ? undefined : key);

function summarise(claims: ClaimApplication[]): Waiting {
  return { count: claims.length, total: claims.reduce((sum, c) => sum + c.amount, 0) };
}

/**
 * Money the employee is waiting on -- the one total worth putting in a header.
 * Read off the first page when that page already holds every claim needed;
 * asked for separately when it does not.
 */
async function waitingFrom(first: ClaimPage, filterKey: string): Promise<Waiting | null> {
  const complete = first.items.length >= first.total;
  if (complete && (filterKey === 'ALL' || filterKey === 'PENDING')) {
    return summarise(first.items.filter((c) => statusOf(c.status) === 'PENDING'));
  }
  try {
    const page = await claimService.getApplications({ page: 1, pageSize: 100, status: 'PENDING' });
    return { count: page.total, total: summarise(page.items).total };
  } catch {
    return null;
  }
}

export const ClaimsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [filter, setFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [allBalances, setAllBalances] = useState(false);

  /** The filter as of the latest tap, readable by a focus reload without re-subscribing it. */
  const filterRef = useRef('ALL');
  /**
   * Only the newest request may land. Tapping two chips quickly must not end
   * with the first chip's claims listed under the second chip's name.
   */
  const ticket = useRef(0);

  const patch = useCallback((change: Partial<Ready>) => {
    setLoad((prev) => (prev.kind === 'ready' ? { ...prev, ...change } : prev));
  }, []);

  const fetchAll = useCallback(async () => {
    const mine = ++ticket.current;
    const key = filterRef.current;
    try {
      // Both halves of the page in parallel: the list must not wait on the
      // allowance, and a tenant with no claim limits set still has claims.
      const [first, balances] = await Promise.all([
        claimService.getApplications({ page: 1, pageSize: PAGE_SIZE, status: statusParam(key) }),
        claimService.getBalance().catch(() => [] as ClaimBalance[]),
      ]);
      const waiting = await waitingFrom(first, key);
      if (mine !== ticket.current) return;
      setLoad({
        kind: 'ready',
        balances,
        waiting,
        claims: first.items,
        total: first.total,
        page: 1,
        listBusy: false,
        listError: null,
        loadingMore: false,
        moreFailed: false,
      });
    } catch (err) {
      if (mine !== ticket.current) return;
      const message = serverMessage(err, 'Could not load your claims.');
      // 403 is "you are not linked to an employee record in this company".
      // Asking again gets the same answer, so it offers a way back, not a retry.
      setLoad(statusOfError(err) === 403 ? { kind: 'locked', message } : { kind: 'failed', message });
    }
  }, []);

  const fetchList = useCallback(async (key: string) => {
    const mine = ++ticket.current;
    patch({ claims: [], total: 0, page: 1, listBusy: true, listError: null, loadingMore: false, moreFailed: false });
    try {
      const first = await claimService.getApplications({ page: 1, pageSize: PAGE_SIZE, status: statusParam(key) });
      if (mine !== ticket.current) return;
      patch({ claims: first.items, total: first.total, page: 1, listBusy: false });
    } catch (err) {
      if (mine !== ticket.current) return;
      patch({ listBusy: false, listError: serverMessage(err, 'Could not load these claims.') });
    }
  }, [patch]);

  useFocusEffect(
    useCallback(() => {
      void fetchAll();
    }, [fetchAll]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  /** The spinner comes back while it runs, so a slow retry is visibly happening and cannot be tapped twice. */
  const retry = () => {
    setLoad({ kind: 'loading' });
    void fetchAll();
  };

  const changeFilter = (key: string) => {
    if (key === filterRef.current) return;
    filterRef.current = key;
    setFilter(key);
    void fetchList(key);
  };

  const loadMore = async () => {
    if (load.kind !== 'ready' || load.listBusy || load.loadingMore || load.claims.length >= load.total) return;
    // Paging does not take a new ticket: a reload or a filter change started
    // meanwhile must win over a page that was asked for before it.
    const mine = ticket.current;
    const nextPage = load.page + 1;
    patch({ loadingMore: true, moreFailed: false });
    try {
      const next = await claimService.getApplications({
        page: nextPage,
        pageSize: PAGE_SIZE,
        status: statusParam(filterRef.current),
      });
      if (mine !== ticket.current) return;
      setLoad((prev) => {
        if (prev.kind !== 'ready') return prev;
        // A claim sent meanwhile shifts every page by one row; without this the
        // row pushed across the page edge would be listed twice.
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
      patch({ loadingMore: false, moreFailed: true });
    }
  };

  const ready = load.kind === 'ready' ? load : null;
  const claims = ready?.claims ?? [];
  const balances = ready?.balances ?? [];
  const waiting = ready?.waiting ?? null;

  /** Only types HR gave a limit; an unlimited type has nothing to count down. */
  const capped = balances.filter((b) => b.yearlyLimit > 0 || b.monthlyLimit > 0);
  const collapsible = capped.length > BALANCES_SHOWN;
  const shownBalances = allBalances ? capped : capped.slice(0, BALANCES_SHOWN);

  /** No claims at all, as opposed to none under this filter. */
  const nothingYet = ready !== null && filter === 'ALL' && !ready.listBusy && !ready.listError && ready.total === 0;

  const openClaim = (claim: ClaimApplication) => {
    goTo(navigation, 'ClaimDetails', { claimId: claim.id });
  };

  const newClaim = () => {
    goTo(navigation, 'CreateClaim', {});
  };

  // The claim types page had no way in for anyone but an owner, though what the
  // company will pay for is exactly what you want to know before filling the
  // form in. It rides on a section heading now rather than a row of its own.
  const openTypes = () => goTo(navigation, 'ClaimTypes', {});

  const fabBottom = Math.max(insets.bottom, 12) + 16;

  const header = (
    <View>
      {capped.length > 0 ? (
        <>
          <SectionHeading title="LEFT TO CLAIM" actionLabel="What can I claim?" onAction={openTypes} />
          <View style={styles.panel}>
            {shownBalances.map((b, index) => (
              <BalanceRow
                key={b.claimTypeId}
                balance={b}
                last={!collapsible && index === shownBalances.length - 1}
              />
            ))}
            {collapsible ? (
              <TouchableOpacity
                style={styles.more}
                onPress={() => setAllBalances((open) => !open)}
                accessibilityRole="button"
              >
                <Text style={styles.moreText}>{allBalances ? 'Show less' : `Show all ${capped.length}`}</Text>
                <MaterialCommunityIcons name={allBalances ? 'chevron-up' : 'chevron-down'} size={18} color={C.blue} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.gap} />
        </>
      ) : null}

      <SectionHeading
        title="YOUR CLAIMS"
        actionLabel={capped.length > 0 ? undefined : 'What can I claim?'}
        onAction={capped.length > 0 ? undefined : openTypes}
      />
      <FilterChips
        filters={CLAIM_FILTERS}
        active={filter}
        counts={{ PENDING: waiting?.count ?? 0 }}
        onChange={changeFilter}
        inset={GUTTER}
      />
      <View style={styles.chipGap} />
    </View>
  );

  const filterLabel = CLAIM_FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? '';

  const empty = !ready ? null : ready.listBusy ? (
    <View style={styles.listBusy}>
      <ActivityIndicator size="small" color={C.blue} />
    </View>
  ) : ready.listError ? (
    <ClaimState
      icon="cloud-off-outline"
      title="Could not load these claims"
      body={ready.listError}
      tone="danger"
      actionLabel="Try again"
      onAction={() => void fetchList(filter)}
    />
  ) : nothingYet ? (
    <ClaimState
      icon="receipt"
      title="No claims yet"
      body="Paid for something on the company's behalf? Claim it back here and track what happens to it."
      actionLabel="Make a claim"
      onAction={newClaim}
    />
  ) : (
    <ClaimState
      icon="filter-variant"
      title={`No ${filterLabel} claims`}
      body="Nothing matches this filter."
      actionLabel="Show all"
      onAction={() => changeFilter('ALL')}
    />
  );

  const footer = !ready ? null : ready.loadingMore ? (
    <View style={styles.listBusy}>
      <ActivityIndicator size="small" color={C.blue} />
    </View>
  ) : ready.moreFailed ? (
    <TouchableOpacity style={styles.moreFailed} onPress={() => { void loadMore(); }} accessibilityRole="button">
      <Text style={styles.moreFailedText}>Could not load more. Tap to try again.</Text>
    </TouchableOpacity>
  ) : null;

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
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>My Claims</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {waiting && waiting.count > 0
                ? `${waiting.count} waiting · ${money(waiting.total)}`
                : ready && filter === 'ALL' && ready.total > 0
                  ? `${ready.total} ${ready.total === 1 ? 'claim' : 'claims'} so far`
                  : 'What you have spent, and got back'}
            </Text>
          </View>
        </View>

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'locked' ? (
          <ClaimState
            icon="account-off-outline"
            title="No claims for this account"
            body={load.message}
            actionLabel="Go back"
            onAction={() => navigation.goBack()}
          />
        ) : load.kind === 'failed' ? (
          <ClaimState
            icon="cloud-off-outline"
            title="Could not load your claims"
            body={load.message}
            tone="danger"
            actionLabel="Try again"
            onAction={retry}
          />
        ) : (
          <FlatList
            data={claims}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => <ClaimCard claim={item} onPress={() => openClaim(item)} />}
            ListHeaderComponent={header}
            ListEmptyComponent={empty}
            ListFooterComponent={footer}
            contentContainerStyle={[styles.list, { paddingBottom: fabBottom + FAB_HEIGHT + 16 }]}
            showsVerticalScrollIndicator={false}
            onEndReached={() => { void loadMore(); }}
            onEndReachedThreshold={0.4}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
          />
        )}
      </SafeAreaView>

      {/* With nothing on the list the empty state carries the same action, and
          the floating button would sit on top of it. Lifted clear of the home
          indicator on iOS and of the three-button bar on Android, which the app
          draws under now that it runs edge to edge. */}
      {ready && !nothingYet ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={newClaim}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Make a claim"
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          <Text style={styles.fabText}>New claim</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 10, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, left: 64, right: 64, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 1 },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: GUTTER, gap: 10 },
  gap: { height: 14 },
  chipGap: { height: 2 },
  listBusy: { paddingVertical: 24, alignItems: 'center' },

  panel: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14 },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  moreText: { fontSize: 13, fontWeight: '700', color: C.blue },

  moreFailed: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreFailedText: { fontSize: 13, fontWeight: '600', color: C.danger },

  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: FAB_HEIGHT,
    borderRadius: 26,
    backgroundColor: C.blue,
    shadowColor: C.blue,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default ClaimsScreen;
