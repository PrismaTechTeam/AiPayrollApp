/**
 * Leave History — every leave application the employee made in one year.
 *
 * The "View all" behind the latest leave card. It states one thing: what was
 * applied for and where each one stands. Balances live on My Leaves; this page
 * does not repeat them.
 *
 * The status chips filter a list already on the phone rather than re-querying,
 * because one year of one employee's leave is a short list and a chip that
 * pauses to hit the network feels broken. A chip appears only when it has
 * something under it, so the row is not a wall of zeros, and the year switcher
 * shares that row instead of costing one of its own.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { useDialog } from '../components/ui/AppDialog';
import type { RootStackParamList } from '../navigation/types';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import { LeaveCard, LeaveHeader, LeaveState, YearBar, leaveStatusKey } from '../components/leave/LeaveUi';

/**
 * Withdrawn leave is counted under Cancelled (leaveStatusKey): it is off the
 * approver's list and the days are back, which is what Cancelled means here.
 * Draft stays last because the app can no longer make one; it only appears for
 * someone who still has an old draft on record.
 */
const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'DRAFT', label: 'Draft' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; year: number; leaves: LeaveApplication[] }
  | { kind: 'failed'; message: string };

/** Why a read was started; only the first may replace the page with an error. */
type Mode = 'initial' | 'focus' | 'refresh' | 'year';

export const LeaveHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const route = useRoute<RouteProp<RootStackParamList, 'LeaveHistory'>>();
  const thisYear = useRef(new Date().getFullYear()).current;

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRef = useRef(load);
  loadRef.current = load;
  const wantedYear = useRef(route.params?.year ?? thisYear);
  const focused = useRef(false);
  const seq = useRef(0);

  const show = useCallback(async (target: number, mode: Mode) => {
    const mine = ++seq.current;
    wantedYear.current = target;
    if (mode === 'initial') setLoad({ kind: 'loading' });
    if (mode === 'year') setSwitchingTo(target);
    try {
      const result = await leaveService.getApplications({ page: 1, pageSize: 100, year: target });
      if (mine !== seq.current) return;
      setLoad({ kind: 'ready', year: target, leaves: result.items });
    } catch (err) {
      if (mine !== seq.current) return;
      const message = serverMessage(err, 'Could not load your leave history.');
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
  }, [dialog]);

  // Coming back from a leave refreshes the list in place, so the scroll
  // position survives instead of the page blanking to a spinner.
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

  const leaves = useMemo(() => (load.kind === 'ready' ? load.leaves : []), [load]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: leaves.length };
    leaves.forEach((l) => {
      const key = leaveStatusKey(l.status);
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [leaves]);

  const chips = FILTERS.filter((f) => f.key === 'ALL' || f.key === filter || (counts[f.key] ?? 0) > 0);

  const visible = useMemo(
    () => (filter === 'ALL' ? leaves : leaves.filter((l) => leaveStatusKey(l.status) === filter)),
    [leaves, filter],
  );

  const openLeave = (leave: LeaveApplication) => {
    navigation.navigate('LeaveDetails', { leaveId: leave.id });
  };

  const label = FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? '';
  const subtitle = load.kind === 'ready'
    ? `${leaves.length} ${leaves.length === 1 ? 'application' : 'applications'} in ${year}`
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <LeaveHeader title="Leave History" subtitle={subtitle} onBack={() => navigation.goBack()} />

        <View style={styles.toolbar}>
          <FlatList
            horizontal
            data={chips}
            keyExtractor={(f) => f.key}
            showsHorizontalScrollIndicator={false}
            style={styles.chipStrip}
            contentContainerStyle={styles.chipRow}
            renderItem={({ item }) => {
              const active = filter === item.key;
              const n = counts[item.key] ?? 0;
              return (
                <TouchableOpacity
                  onPress={() => setFilter(item.key)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${item.label}, ${n}`}
                  hitSlop={{ top: 6, bottom: 6 }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                  {n > 0 ? (
                    <View style={[styles.chipCount, active && styles.chipCountActive]}>
                      <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{n}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
          <YearBar
            compact
            year={year}
            maxYear={thisYear + 1}
            onChange={(next) => { void show(next, 'year'); }}
            busy={switchingTo !== null}
          />
        </View>

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator color={C.blue} />
          </View>
        ) : load.kind === 'failed' ? (
          <LeaveState
            icon="cloud-off-outline"
            title="Could not load your leave history"
            body={load.message}
            tone="danger"
            onRetry={() => { void show(wantedYear.current, 'initial'); }}
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => <LeaveCard leave={item} onPress={() => openLeave(item)} />}
            style={switchingTo !== null ? styles.dim : undefined}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              <LeaveState
                icon="calendar-blank-outline"
                title={filter === 'ALL' ? `No leave in ${year}` : `Nothing ${label} in ${year}`}
                body={
                  filter === 'ALL'
                    ? 'Nothing was applied for in this year.'
                    : `You have leave in ${year}, but none of it is ${label}.`
                }
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  dim: { opacity: 0.45 },

  toolbar: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  chipStrip: { flex: 1, flexGrow: 1 },
  chipRow: { paddingLeft: 16, paddingRight: 8, paddingVertical: 6, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 13, fontWeight: '700', color: '#3B4A63' },
  chipTextActive: { color: '#FFFFFF' },
  chipCount: { minWidth: 20, paddingHorizontal: 5, height: 20, borderRadius: 10, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 11, fontWeight: '800', color: C.blue },
  chipCountTextActive: { color: '#FFFFFF' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 8 },
});

export default LeaveHistoryScreen;
