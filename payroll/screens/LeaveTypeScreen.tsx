/**
 * One leave type, one year — the allowance and when it was used.
 *
 * Opened from a row on My Leaves, so it answers the question that row raises:
 * "13 days remaining of what, and where did the other 3 go?" The dates are the
 * point of the page; the numbers at the top are there so the two agree.
 *
 * A type with no entitlement (unpaid leave, or one HR never issued a row for)
 * still gets this page. It has no allowance to count down, but the employee can
 * take it and the days they took are just as real.
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
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import leaveService, { LeaveApplication, MyLeaveEntitlement } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import {
  LeaveCard,
  LeaveState,
  SectionHeading,
  YearBar,
  dayNumber,
  dayText,
  goTo,
  leaveIcon,
  leaveTint,
  leaveWash,
  noBalanceText,
} from '../components/leave/LeaveUi';

type Params = {
  LeaveType: {
    leaveTypeId: string;
    leaveTypeName?: string;
    year?: number;
  };
};

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; item: MyLeaveEntitlement | null; leaves: LeaveApplication[] }
  | { kind: 'failed'; message: string };

export const LeaveTypeScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'LeaveType'>>();
  const { leaveTypeId, leaveTypeName } = route.params;
  const thisYear = useRef(new Date().getFullYear()).current;

  const [year, setYear] = useState(route.params.year ?? thisYear);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  // The allowance is re-read rather than passed in through the route, so pulling
  // to refresh on this page shows the same numbers HR would see, not a snapshot
  // taken when the row was tapped.
  const fetchYear = useCallback(
    async (target: number) => {
      try {
        const [entitlements, applications] = await Promise.all([
          leaveService.getMyEntitlements(target),
          leaveService.getApplications({ page: 1, pageSize: 100, year: target, leaveTypeId }),
        ]);
        if (!alive.current) return;
        setLoad({
          kind: 'ready',
          item: entitlements.items.find((i) => i.leaveTypeId === leaveTypeId) ?? null,
          leaves: applications.items,
        });
      } catch (err) {
        if (!alive.current) return;
        setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load this leave type.') });
      }
    },
    [leaveTypeId],
  );

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

  const item = load.kind === 'ready' ? load.item : null;
  const title = item?.description || leaveTypeName || 'Leave';
  const tint = leaveTint({ color: item?.color, code: item?.code });
  const entitled = item !== null && item.hasEntitlement && item.availableDays !== null;
  const allowance = entitled ? (item.entitledDays ?? 0) + (item.carryForwardDays ?? 0) : 0;
  // Days awaiting an answer are spoken for just as firmly as days already taken,
  // so the bar counts both — otherwise it disagrees with the Available cell.
  const spokenFor = entitled ? item.usedDays + item.pendingDays : 0;
  const fraction = entitled && allowance > 0 ? Math.min(1, Math.max(0, spokenFor / allowance)) : 0;

  const openLeave = (leave: LeaveApplication) => {
    goTo(navigation, 'LeaveDetails', { leaveId: leave.id, canApprove: false });
  };

  // Arriving here with the type already chosen saves picking it again on the form.
  const openApply = () => {
    goTo(navigation, 'CreateLeave', { leaveTypeId });
  };

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
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerSubtitle}>Your record for {year}</Text>
          </View>
        </View>

        <View style={styles.yearWrap}>
          <YearBar year={year} maxYear={thisYear} onChange={setYear} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
        >
          {load.kind === 'loading' ? (
            <View style={styles.centre}>
              <ActivityIndicator color={C.blue} />
            </View>
          ) : load.kind === 'failed' ? (
            <LeaveState
              icon="cloud-off-outline"
              title="Could not load this leave type"
              body={load.message}
              tone="danger"
              onRetry={() => void onRefresh()}
            />
          ) : (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryTop}>
                  <View style={[styles.summaryIcon, { backgroundColor: leaveWash(tint) }]}>
                    <MaterialCommunityIcons name={leaveIcon(item?.code)} size={24} color={tint} />
                  </View>
                  <View style={styles.summaryHead}>
                    <Text style={styles.summaryTitle} numberOfLines={1}>{title}</Text>
                    {/* Only when there is an entitlement to name: with none, the
                        headline underneath already says so, and saying it twice
                        in two lines reads as two different facts. */}
                    {entitled ? (
                      <Text style={styles.summarySub} numberOfLines={1}>
                        Entitlement {dayText(item?.entitledDays)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* The headline is what can be BOOKED, because that is the number
                    the server measures a request against. Entitled, used and
                    pending sit under it so the employee can see for themselves
                    why it is not the same as their entitlement. */}
                <View style={styles.hero}>
                  <Text style={[styles.heroValue, entitled ? { color: tint } : null]}>
                    {entitled ? dayNumber(item?.availableDays) : '–'}
                  </Text>
                  <Text style={styles.heroLabel}>
                    {entitled ? 'days available to book' : item ? noBalanceText(item) : 'No entitlement limit'}
                  </Text>
                </View>

                {entitled ? (
                  <>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: tint }]} />
                    </View>
                    <View style={styles.cells}>
                      <Cell label="Entitled" value={dayNumber(item?.entitledDays)} />
                      <View style={styles.rule} />
                      <Cell label="Used" value={dayNumber(item?.usedDays)} />
                      <View style={styles.rule} />
                      <Cell label="Pending" value={dayNumber(item?.pendingDays)} />
                    </View>
                  </>
                ) : (
                  <View style={styles.cells}>
                    <Cell label="Entitled" value="–" />
                    <View style={styles.rule} />
                    <Cell label="Used" value={dayNumber(item?.usedDays ?? 0)} />
                    <View style={styles.rule} />
                    <Cell label="Pending" value={dayNumber(item?.pendingDays ?? 0)} />
                  </View>
                )}

                {/* Only the lines that change the number get printed. */}
                {entitled && (item?.carryForwardDays ?? 0) > 0 ? (
                  <Text style={styles.note}>
                    Includes {dayText(item?.carryForwardDays)} carried forward.
                  </Text>
                ) : null}
                {(item?.pendingDays ?? 0) > 0 ? (
                  <Text style={styles.note}>
                    {dayText(item?.pendingDays)} are waiting on approval and are already held back
                    from what you can book.
                  </Text>
                ) : null}
                {!entitled && item?.isEntitle && !item?.isUnpaid ? (
                  <Text style={styles.note}>
                    HR has not set an allowance for this leave in {year}. Ask them before you apply.
                  </Text>
                ) : null}
                {!entitled && !(item?.isEntitle && !item?.isUnpaid) ? (
                  <Text style={styles.note}>
                    There is no yearly allowance for this leave. You can still apply for it.
                  </Text>
                ) : null}
              </View>

              {item?.isActive !== false ? (
                <>
                  <View style={styles.gap} />
                  <PrimaryButton icon="calendar-plus" label="Apply for this leave" onPress={openApply} />
                </>
              ) : null}

              <View style={styles.gap} />

              <SectionHeading title="WHEN IT WAS USED" />
              {load.leaves.length === 0 ? (
                <View style={styles.quietCard}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={C.muted} />
                  <Text style={styles.quietText}>You have not taken this leave in {year}.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {load.leaves.map((leave) => (
                    <LeaveCard key={leave.id} leave={leave} showType={false} onPress={() => openLeave(leave)} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const Cell: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <View style={styles.cell}>
    <Text style={[styles.cellValue, tone ? { color: tone } : null]}>{value}</Text>
    <Text style={styles.cellLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { position: 'absolute', left: 62, right: 62, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  yearWrap: { marginHorizontal: 20, marginBottom: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  gap: { height: 24 },

  summary: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  summaryHead: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  summarySub: { fontSize: 13, color: C.body, marginTop: 2 },

  hero: { alignItems: 'center', marginTop: 18 },
  heroValue: { fontSize: 40, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'], lineHeight: 46 },
  heroLabel: { fontSize: 13, color: C.body, marginTop: 2, textAlign: 'center' },

  cells: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  cell: { flex: 1, alignItems: 'center' },
  cellValue: { fontSize: 20, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  cellLabel: { fontSize: 12, color: C.muted, marginTop: 3 },
  rule: { width: 1, height: 28, backgroundColor: C.line },

  track: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 16 },
  fill: { height: 6, borderRadius: 3 },

  note: { fontSize: 12, color: C.body, marginTop: 10 },

  list: { gap: 10 },
  quietCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  quietText: { flex: 1, fontSize: 13, color: C.body },
});

export default LeaveTypeScreen;
