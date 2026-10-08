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
 *
 * The summary is numbers only. It used to repeat the type's name under the
 * header that already says it and carry up to three sentences of explanation;
 * the carry-forward those sentences described is now its own cell, and the
 * year switcher lives on the card it changes instead of a bar of its own.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import type { RootStackParamList } from '../navigation/types';
import leaveService, { LeaveApplication, MyLeaveEntitlement } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import {
  LeaveCard,
  LeaveHeader,
  LeaveState,
  SectionHeading,
  YearBar,
  dayNumber,
  leaveIcon,
  leaveTint,
  leaveWash,
  noBalanceText,
} from '../components/leave/LeaveUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; year: number; item: MyLeaveEntitlement | null; leaves: LeaveApplication[] }
  | { kind: 'failed'; message: string };

/** Why a read was started; only the first may replace the page with an error. */
type Mode = 'initial' | 'focus' | 'refresh' | 'year';

export const LeaveTypeScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const route = useRoute<RouteProp<RootStackParamList, 'LeaveType'>>();
  // `description` is the name the row was showing, used until the entitlement
  // arrives so the header is never blank while it loads.
  const { leaveTypeId, description } = route.params;
  const thisYear = useRef(new Date().getFullYear()).current;

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRef = useRef(load);
  loadRef.current = load;
  const wantedYear = useRef(route.params.year ?? thisYear);
  const focused = useRef(false);
  const seq = useRef(0);

  // The allowance is re-read rather than passed in through the route, so pulling
  // to refresh on this page shows the same numbers HR would see, not a snapshot
  // taken when the row was tapped.
  const show = useCallback(
    async (target: number, mode: Mode) => {
      const mine = ++seq.current;
      wantedYear.current = target;
      if (mode === 'initial') setLoad({ kind: 'loading' });
      if (mode === 'year') setSwitchingTo(target);
      try {
        const [entitlements, applications] = await Promise.all([
          leaveService.getMyEntitlements(target),
          leaveService.getApplications({ page: 1, pageSize: 100, year: target, leaveTypeId }),
        ]);
        if (mine !== seq.current) return;
        setLoad({
          kind: 'ready',
          year: target,
          item: entitlements.items.find((i) => i.leaveTypeId === leaveTypeId) ?? null,
          leaves: applications.items,
        });
      } catch (err) {
        if (mine !== seq.current) return;
        const message = serverMessage(err, 'Could not load this leave type.');
        if (mode === 'initial' || loadRef.current.kind !== 'ready') {
          setLoad({ kind: 'failed', message });
        } else if ((mode === 'year' || mode === 'refresh') && focused.current) {
          void dialog.notify({
            title: mode === 'year' ? `Could not load ${target}` : 'Could not refresh',
            message,
            tone: 'danger',
          });
        }
      } finally {
        if (mine === seq.current) setSwitchingTo(null);
      }
    },
    [leaveTypeId, dialog],
  );

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      const current = loadRef.current;
      void show(current.kind === 'ready' ? current.year : wantedYear.current, current.kind === 'ready' ? 'focus' : 'initial');
      return () => {
        focused.current = false;
      };
    }, [show]),
  );

  const year = load.kind === 'ready' ? load.year : wantedYear.current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await show(year, 'refresh');
    setRefreshing(false);
  }, [show, year]);

  const item = load.kind === 'ready' ? load.item : null;
  const title = item?.description || description || 'Leave';
  const tint = leaveTint({ color: item?.color, code: item?.code });
  const entitled = item !== null && item.hasEntitlement && item.availableDays !== null;
  const carried = entitled ? item.carryForwardDays ?? 0 : 0;
  const allowance = entitled ? (item.entitledDays ?? 0) + carried : 0;
  // Days awaiting an answer are spoken for just as firmly as days already taken,
  // so the bar counts both — otherwise it disagrees with the Available number.
  const spokenFor = entitled ? item.usedDays + item.pendingDays : 0;
  const fraction = entitled && allowance > 0 ? Math.min(1, Math.max(0, spokenFor / allowance)) : 0;

  const openLeave = (leave: LeaveApplication) => {
    navigation.navigate('LeaveDetails', { leaveId: leave.id });
  };

  // Arriving here with the type already chosen saves picking it again on the form.
  const openApply = () => {
    navigation.navigate('CreateLeave', { leaveTypeId });
  };

  const body = () => {
    if (load.kind === 'loading') {
      return (
        <View style={styles.centre}>
          <ActivityIndicator color={C.blue} />
        </View>
      );
    }

    if (load.kind === 'failed') {
      return (
        <LeaveState
          icon="cloud-off-outline"
          title="Could not load this leave type"
          body={load.message}
          tone="danger"
          onRetry={() => { void show(wantedYear.current, 'initial'); }}
        />
      );
    }

    return (
      <>
        <View style={[styles.summary, switchingTo !== null && styles.dim]}>
          {/* The headline is what can be BOOKED, because that is the number the
              server measures a request against. Entitled, used and pending sit
              under it so the employee can see why it is not their entitlement. */}
          <View style={styles.summaryTop}>
            <View style={[styles.summaryIcon, { backgroundColor: leaveWash(tint) }]}>
              <MaterialCommunityIcons name={leaveIcon(item?.code)} size={20} color={tint} />
            </View>
            <View style={styles.hero}>
              <Text style={[styles.heroValue, entitled ? { color: tint } : null]}>
                {entitled ? dayNumber(item?.availableDays) : '–'}
              </Text>
              <Text style={styles.heroLabel} numberOfLines={2}>
                {entitled ? 'days available to book' : item ? noBalanceText(item) : 'No entitlement limit'}
              </Text>
            </View>
            <YearBar
              compact
              year={year}
              maxYear={thisYear + 1}
              onChange={(next) => { void show(next, 'year'); }}
              busy={switchingTo !== null}
            />
          </View>

          {entitled ? (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: tint }]} />
            </View>
          ) : null}

          <View style={styles.cells}>
            {entitled ? (
              <>
                <Cell label="Entitled" value={dayNumber(item?.entitledDays)} />
                <View style={styles.rule} />
              </>
            ) : null}
            {/* Carried forward from last year: part of the allowance, so it
                gets a number rather than a sentence explaining it. */}
            {carried > 0 ? (
              <>
                <Cell label="Carried" value={dayNumber(carried)} />
                <View style={styles.rule} />
              </>
            ) : null}
            <Cell label="Used" value={dayNumber(item?.usedDays ?? 0)} />
            <View style={styles.rule} />
            <Cell label="Pending" value={dayNumber(item?.pendingDays ?? 0)} tone={(item?.pendingDays ?? 0) > 0 ? '#B45309' : undefined} />
          </View>
        </View>

        {/* Only for a type this employee has in the year on screen and that is
            still offered; with no row the form would open on a type it cannot show. */}
        {item !== null && item.isActive ? (
          <>
            <View style={styles.gap} />
            <PrimaryButton icon="calendar-plus" label="Apply for this leave" onPress={openApply} compact />
          </>
        ) : null}

        <View style={styles.gap} />

        <SectionHeading title={`WHEN IT WAS USED IN ${year}`} />
        {load.leaves.length === 0 ? (
          <View style={styles.quietCard}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={C.muted} />
            <Text style={styles.quietText}>You have not applied for this leave in {year}.</Text>
          </View>
        ) : (
          <View style={[styles.list, switchingTo !== null && styles.dim]}>
            {load.leaves.map((leave) => (
              <LeaveCard key={leave.id} leave={leave} showType={false} onPress={() => openLeave(leave)} />
            ))}
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <LeaveHeader title={title} onBack={() => navigation.goBack()} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={load.kind === 'ready'
            ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
            : undefined}
        >
          {body()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const Cell: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <View style={styles.cell}>
    <Text style={[styles.cellValue, tone ? { color: tone } : null]} numberOfLines={1}>{value}</Text>
    <Text style={styles.cellLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  gap: { height: 12 },
  dim: { opacity: 0.45 },

  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hero: { flex: 1 },
  heroValue: { fontSize: 30, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'], lineHeight: 36 },
  heroLabel: { fontSize: 12, color: C.body },

  cells: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  cell: { flex: 1, alignItems: 'center' },
  cellValue: { fontSize: 18, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  cellLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  rule: { width: 1, height: 26, backgroundColor: C.line },

  track: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 12 },
  fill: { height: 6, borderRadius: 3 },

  list: { gap: 8 },
  quietCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  quietText: { flex: 1, fontSize: 13, color: C.body },
});

export default LeaveTypeScreen;
