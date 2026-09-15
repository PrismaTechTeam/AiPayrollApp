/**
 * My Payslips — every month the employee has been paid, newest first.
 *
 * The latest month gets the top of the page and the only large figure on it,
 * because "what did I get paid" is the question that brings people here. The
 * rest is a plain list; the breakdown lives on its own screen rather than being
 * unfolded inline, which is what made the old version a wall of rows.
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
import payslipService, { PayslipListItem } from '../api/services/payslipService';
import { serverMessage } from '../lib/serverMessage';
import {
  PayslipRow,
  PayslipState,
  SectionHeading,
  YearBar,
  goTo,
  money,
  monthLabel,
  ringgit,
} from '../components/payslips/PayslipUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; items: PayslipListItem[]; total: number }
  | { kind: 'failed'; message: string };

export const MyPayslipScreen: React.FC = () => {
  const navigation = useNavigation();
  const thisYear = useRef(new Date().getFullYear()).current;

  const [year, setYear] = useState(thisYear);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const fetchYear = useCallback(async (target: number) => {
    try {
      // A year of monthly runs is twelve rows, plus room for the ad-hoc ones a
      // company slips in — one page covers a year, so there is nothing to page.
      const page = await payslipService.getList({ year: target, page: 1, pageSize: 24 });
      if (!alive.current) return;
      setLoad({ kind: 'ready', items: page.items ?? [], total: page.total ?? (page.items?.length ?? 0) });
    } catch (err) {
      if (!alive.current) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your payslips.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setLoad({ kind: 'loading' });
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

  const open = (payslip: PayslipListItem) => {
    goTo(navigation, 'PayslipDetails', { payrollRunId: payslip.payrollRunId });
  };

  const latest = load.kind === 'ready' ? load.items[0] ?? null : null;
  const earlier = load.kind === 'ready' ? load.items.slice(1) : [];

  const subtitle =
    load.kind === 'ready'
      ? load.total === 0
        ? `Nothing paid in ${year}`
        : `${load.total} payslip${load.total === 1 ? '' : 's'} in ${year}`
      : 'Your pay, month by month';

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
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>My Payslips</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.yearWrap}>
          <YearBar year={year} maxYear={thisYear} onChange={setYear} />
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
              <SectionHeading title="LATEST" />
              <TouchableOpacity
                style={styles.hero}
                onPress={() => open(latest)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${monthLabel(latest.payrollYear, latest.payrollMonth)} payslip, net pay ${ringgit(latest.netPay)}`}
              >
                <View style={styles.heroTop}>
                  <Text style={styles.heroMonth}>{monthLabel(latest.payrollYear, latest.payrollMonth)}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
                </View>

                <Text style={styles.heroLabel}>NET PAY</Text>
                <Text style={styles.heroAmount}>{ringgit(latest.netPay)}</Text>

                {/* Dash for an exact zero, the same as every other payslip figure:
                    a "0.00" here beside a "-" on the payslip itself reads as a
                    disagreement between the two. */}
                <View style={styles.heroSplit}>
                  <View style={styles.heroCell}>
                    <Text style={styles.heroCellLabel}>Gross</Text>
                    <Text style={styles.heroCellValue}>{money(latest.grossPay)}</Text>
                  </View>
                  <View style={styles.heroRule} />
                  <View style={styles.heroCell}>
                    <Text style={styles.heroCellLabel}>Deductions</Text>
                    <Text style={styles.heroCellValue}>{money(latest.grossDeductions)}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {earlier.length > 0 ? (
                <>
                  <View style={styles.gap} />
                  <SectionHeading title="EARLIER" />
                  {earlier.map((payslip) => (
                    <PayslipRow key={payslip.payrollRunId} payslip={payslip} onPress={() => open(payslip)} />
                  ))}
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

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  yearWrap: { marginHorizontal: 20, marginBottom: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  gap: { height: 24 },

  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
    // The one lifted card on the page. Everything else sits flat on the backdrop.
    shadowColor: C.ink,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroMonth: { fontSize: 15, fontWeight: '700', color: C.ink },
  heroLabel: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.8, marginTop: 14 },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: C.ink,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  heroSplit: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  heroCell: { flex: 1, paddingBottom: 12 },
  heroCellLabel: { fontSize: 12, color: C.body },
  heroCellValue: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  heroRule: { width: 1, alignSelf: 'stretch', backgroundColor: C.line, marginBottom: 12 },
});

export default MyPayslipScreen;
