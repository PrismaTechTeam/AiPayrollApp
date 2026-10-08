/**
 * My Payslips — every payslip the employee has been paid in a year, newest first.
 *
 * The latest one gets the top of the page and the only large figure on it,
 * because "what did I get paid" is the question that brings people here. The
 * rest is one compact list — a full year fits on one phone screen — and the
 * breakdown lives on its own screen rather than being unfolded inline, which is
 * what made the old version a wall of rows.
 *
 * Loading, failed and empty are three separate answers. The old screen showed
 * the same "no payslips available" panel for all three, so an outage looked
 * exactly like a company that had never run payroll.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
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
import { usePayrollAuth } from '../context/PayrollAuthContext';
import payslipService, { PayslipListItem } from '../api/services/payslipService';
import { serverMessage } from '../lib/serverMessage';
import {
  PayslipPanel,
  PayslipRow,
  PayslipState,
  SectionHeading,
  YearSwitch,
  goTo,
  money,
  monthLabel,
  ringgit,
  runLabel,
} from '../components/payslips/PayslipUi';

/** The server's page-size ceiling: a year of weekly runs plus a few bonus runs. */
const PAGE_SIZE = 60;

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; year: number; items: PayslipListItem[]; total: number; page: number }
  | { kind: 'failed'; message: string };

/** The first year worth offering: the year they joined, when the app knows it. */
function firstYear(joinDate: string | null | undefined, thisYear: number): number {
  const match = /^(\d{4})/.exec(joinDate ?? '');
  const joined = match ? Number(match[1]) : NaN;
  // Without a join date, ten years back is further than any payslip history the
  // app has seen, and far short of paging through 26 empty years to 2000.
  if (!Number.isFinite(joined) || joined > thisYear) return thisYear - 10;
  return joined;
}

export const MyPayslipScreen: React.FC = () => {
  const navigation = useNavigation();
  const { employee } = usePayrollAuth();
  const thisYear = useRef(new Date().getFullYear()).current;
  const minYear = firstYear(employee?.joinDate, thisYear);

  const [year, setYear] = useState(thisYear);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const alive = useRef(true);
  // The year the screen is showing now. A slow answer for the year the person
  // just paged away from must not land under the new year's label.
  const wanted = useRef(year);

  const fetchYear = useCallback(async (target: number) => {
    try {
      const page = await payslipService.getList({ year: target, page: 1, pageSize: PAGE_SIZE });
      if (!alive.current || wanted.current !== target) return;
      const items = page.items ?? [];
      setLoad({ kind: 'ready', year: target, items, total: page.total ?? items.length, page: 1 });
    } catch (err) {
      if (!alive.current || wanted.current !== target) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your payslips.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      wanted.current = year;
      // Coming back from a payslip keeps the list (and its scroll position) on
      // screen while it refreshes; only a year with nothing to show yet spins.
      setLoad((prev) => (prev.kind === 'ready' && prev.year === year ? prev : { kind: 'loading' }));
      void fetchYear(year);
      return () => {
        alive.current = false;
      };
    }, [fetchYear, year]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchYear(year);
    if (alive.current) setRefreshing(false);
  }, [fetchYear, year]);

  const loadMore = async () => {
    if (load.kind !== 'ready' || loadingMore) return;
    const { year: target, page } = load;
    setLoadingMore(true);
    try {
      const next = await payslipService.getList({ year: target, page: page + 1, pageSize: PAGE_SIZE });
      if (!alive.current || wanted.current !== target) return;
      setLoad((prev) =>
        prev.kind === 'ready' && prev.year === target
          ? { ...prev, items: [...prev.items, ...(next.items ?? [])], total: next.total ?? prev.total, page: page + 1 }
          : prev,
      );
    } catch {
      // The button stays, so the person can simply tap it again.
    } finally {
      if (alive.current) setLoadingMore(false);
    }
  };

  const open = (payslip: PayslipListItem) => {
    // The row goes along so the payslip screen can name the run (a bonus, or
    // 1–15 Aug) — the document itself only carries the month.
    goTo(navigation, 'PayslipDetails', { payrollRunId: payslip.payrollRunId, payslip });
  };

  const latest = load.kind === 'ready' ? load.items[0] ?? null : null;
  const earlier = load.kind === 'ready' ? load.items.slice(1) : [];
  const more = load.kind === 'ready' && load.total > load.items.length;
  const latestRun = latest ? runLabel(latest) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
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
          {/* The year sits under the title rather than in a bar of its own:
              one row of chrome instead of two, the same control. */}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>My Payslips</Text>
            <YearSwitch year={year} minYear={Math.min(minYear, year)} maxYear={thisYear} onChange={setYear} />
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
          }
        >
          {load.kind === 'loading' ? (
            <View style={styles.centre}>
              <ActivityIndicator color={C.blue} />
            </View>
          ) : load.kind === 'failed' ? (
            <PayslipState
              icon="cloud-off-outline"
              title="Could not load your payslips"
              body={load.message}
              tone="danger"
              onRetry={() => void onRefresh()}
            />
          ) : !latest ? (
            <PayslipState
              icon="file-document-outline"
              title={`No payslips in ${year}`}
              body="A payslip appears here once your company completes the payroll run for that month."
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.hero}
                onPress={() => open(latest)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${monthLabel(latest.payrollYear, latest.payrollMonth)}${latestRun ? `, ${latestRun}` : ''} payslip, net pay ${ringgit(latest.netPay)}`}
              >
                <View style={styles.heroTop}>
                  <Text style={styles.heroMonth} numberOfLines={1}>
                    {monthLabel(latest.payrollYear, latest.payrollMonth)}
                    {latestRun ? <Text style={styles.heroRun}>{`  ·  ${latestRun}`}</Text> : null}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
                </View>

                <View style={styles.heroNet}>
                  <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {ringgit(latest.netPay)}
                  </Text>
                  <Text style={styles.heroNetLabel}>net pay</Text>
                </View>

                {/* Dash for an exact zero, the same as every other payslip figure:
                    a "0.00" here beside a "-" on the payslip itself reads as a
                    disagreement between the two. */}
                <Text style={styles.heroSplit} numberOfLines={1}>
                  Gross <Text style={styles.heroSplitValue}>{money(latest.grossPay)}</Text>
                  {'   ·   '}
                  Deductions <Text style={styles.heroSplitValue}>{money(latest.grossDeductions)}</Text>
                </Text>
              </TouchableOpacity>

              {earlier.length > 0 ? (
                <>
                  <View style={styles.gap} />
                  <SectionHeading title="EARLIER" />
                  <PayslipPanel>
                    {earlier.map((payslip, index) => (
                      <PayslipRow
                        key={payslip.payrollRunId}
                        payslip={payslip}
                        onPress={() => open(payslip)}
                        last={index === earlier.length - 1 && !more}
                      />
                    ))}
                    {more ? (
                      <TouchableOpacity
                        style={styles.more}
                        onPress={() => void loadMore()}
                        disabled={loadingMore}
                        accessibilityRole="button"
                        accessibilityLabel="Show more payslips"
                      >
                        {loadingMore ? (
                          <ActivityIndicator size="small" color={C.blue} />
                        ) : (
                          <Text style={styles.moreText}>Show more</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </PayslipPanel>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  // Back arrow, centred title, and a spacer the same width as the arrow, so the
  // title and the year under it are centred on the screen.
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  back: { width: 40, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  gap: { height: 16 },

  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    // The one lifted card on the page. Everything else sits flat on the backdrop.
    shadowColor: C.ink,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroMonth: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  heroRun: { fontSize: 13, fontWeight: '600', color: C.body },
  heroNet: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  heroAmount: { flexShrink: 1, fontSize: 28, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  heroNetLabel: { fontSize: 13, color: C.body },
  heroSplit: { fontSize: 13, color: C.body, marginTop: 6 },
  heroSplitValue: { fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },

  more: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 14, fontWeight: '700', color: C.blue },
});

export default MyPayslipScreen;
