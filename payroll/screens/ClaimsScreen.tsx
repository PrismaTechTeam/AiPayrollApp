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
 */
import React, { useCallback, useMemo, useState } from 'react';
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
import claimService, { ClaimApplication, ClaimBalance } from '../api/services/claimService';
import { serverMessage } from '../lib/serverMessage';
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
const BALANCES_SHOWN = 3;

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; claims: ClaimApplication[]; balances: ClaimBalance[] }
  | { kind: 'failed'; message: string };

export const ClaimsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [filter, setFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [allBalances, setAllBalances] = useState(false);

  const fetch = useCallback(async () => {
    try {
      // Both halves of the page in parallel: the list must not wait on the
      // allowance, and a tenant with no claim limits set still has claims.
      const [page, balances] = await Promise.all([
        claimService.getApplications({ page: 1, pageSize: 100 }),
        claimService.getBalance().catch(() => [] as ClaimBalance[]),
      ]);
      setLoad({ kind: 'ready', claims: page.items, balances });
    } catch (err) {
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your claims.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  const claims = load.kind === 'ready' ? load.claims : [];
  const balances = load.kind === 'ready' ? load.balances : [];

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: claims.length };
    claims.forEach((c) => {
      const key = statusOf(c.status);
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [claims]);

  const visible = useMemo(
    () => (filter === 'ALL' ? claims : claims.filter((c) => statusOf(c.status) === filter)),
    [claims, filter],
  );

  /** Only types HR gave a limit; an unlimited type has nothing to count down. */
  const capped = useMemo(
    () => balances.filter((b) => b.yearlyLimit > 0 || b.monthlyLimit > 0),
    [balances],
  );

  /** Money the employee is waiting on. The one total worth putting in a header. */
  const waiting = useMemo(() => {
    const pending = claims.filter((c) => statusOf(c.status) === 'PENDING');
    return { count: pending.length, total: pending.reduce((sum, c) => sum + c.amount, 0) };
  }, [claims]);

  const shownBalances = allBalances ? capped : capped.slice(0, BALANCES_SHOWN);

  const openClaim = (claim: ClaimApplication) => {
    goTo(navigation, 'ClaimDetails', { claimId: claim.id });
  };

  const newClaim = () => {
    goTo(navigation, 'CreateClaim', {});
  };

  const header = (
    <View>
      {capped.length > 0 ? (
        <>
          <SectionHeading
            title="LEFT TO CLAIM"
            actionLabel={capped.length > BALANCES_SHOWN ? (allBalances ? 'Show less' : `All ${capped.length}`) : undefined}
            onAction={capped.length > BALANCES_SHOWN ? () => setAllBalances((open) => !open) : undefined}
          />
          <View style={styles.panel}>
            {shownBalances.map((b, index) => (
              <BalanceRow key={b.claimTypeId} balance={b} last={index === shownBalances.length - 1} />
            ))}
          </View>
        </>
      ) : null}

      {/* The claim types page had no way in for anyone but an owner, though what
          the company will pay for is exactly what you want to know before
          filling the form in. */}
      <TouchableOpacity
        style={styles.link}
        onPress={() => goTo(navigation, 'ClaimTypes', {})}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="tag-outline" size={20} color={C.blue} />
        <Text style={styles.linkText}>What can I claim for?</Text>
        <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
      </TouchableOpacity>
      <View style={styles.gap} />

      <SectionHeading title="YOUR CLAIMS" />
      <FilterChips filters={CLAIM_FILTERS} active={filter} counts={counts} onChange={setFilter} />
      <View style={styles.chipGap} />
    </View>
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
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>My Claims</Text>
            <Text style={styles.headerSubtitle}>
              {waiting.count > 0
                ? `${waiting.count} waiting · ${money(waiting.total)}`
                : claims.length > 0
                  ? `${claims.length} ${claims.length === 1 ? 'claim' : 'claims'} so far`
                  : 'What you have spent, and got back'}
            </Text>
          </View>
        </View>

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'failed' ? (
          <ClaimState
            icon="cloud-off-outline"
            title="Could not load your claims"
            body={load.message}
            tone="danger"
            actionLabel="Try again"
            onAction={() => void onRefresh()}
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => <ClaimCard claim={item} onPress={() => openClaim(item)} />}
            ListHeaderComponent={header}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              claims.length === 0 ? (
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
                  title="Nothing here"
                  body="No claims match this filter."
                  actionLabel="Show all"
                  onAction={() => setFilter('ALL')}
                />
              )
            }
          />
        )}
      </SafeAreaView>

      {/* With nothing on the list the empty state carries the same action, and
          the floating button would sit on top of the last row of the page. */}
      {load.kind === 'ready' && claims.length > 0 ? (
        <TouchableOpacity
          style={styles.fab}
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

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 110, gap: 12 },
  gap: { height: 22 },
  chipGap: { height: 4 },

  panel: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14 },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 10,
  },
  linkText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 52,
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
