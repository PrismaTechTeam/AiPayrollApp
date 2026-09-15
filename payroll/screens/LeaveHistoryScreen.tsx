/**
 * Leave History — every leave application the employee made in one year.
 *
 * The "View All" behind the latest leave card. It states one thing: what was
 * applied for and where each one stands. Balances live on My Leaves; this page
 * does not repeat them.
 *
 * The status chips filter a list already on the phone rather than re-querying,
 * because one year of one employee's leave is a short list and a chip that
 * pauses to hit the network feels broken.
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
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import { statusOf } from '../components/requests/RequestUi';
import { LeaveCard, LeaveState, YearBar, goTo } from '../components/leave/LeaveUi';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

type Params = { LeaveHistory: { year?: number } | undefined };

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; leaves: LeaveApplication[] }
  | { kind: 'failed'; message: string };

export const LeaveHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'LeaveHistory'>>();
  const thisYear = new Date().getFullYear();

  const [year, setYear] = useState(route.params?.year ?? thisYear);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const fetchYear = useCallback(async (target: number) => {
    try {
      const result = await leaveService.getApplications({ page: 1, pageSize: 100, year: target });
      setLoad({ kind: 'ready', leaves: result.items });
    } catch (err) {
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your leave history.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoad({ kind: 'loading' });
      void fetchYear(year);
    }, [fetchYear, year]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchYear(year);
    setRefreshing(false);
  };

  const leaves = load.kind === 'ready' ? load.leaves : [];

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: leaves.length };
    leaves.forEach((l) => {
      const key = statusOf(l.status);
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [leaves]);

  const visible = useMemo(
    () => (filter === 'ALL' ? leaves : leaves.filter((l) => statusOf(l.status) === filter)),
    [leaves, filter],
  );

  const openLeave = (leave: LeaveApplication) => {
    goTo(navigation, 'LeaveDetails', { leaveId: leave.id, canApprove: false });
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
            <Text style={styles.headerTitle}>Leave History</Text>
            <Text style={styles.headerSubtitle}>Everything you applied for</Text>
          </View>
        </View>

        <View style={styles.yearWrap}>
          <YearBar year={year} maxYear={thisYear} onChange={setYear} />
        </View>

        <FlatList
          horizontal
          data={FILTERS}
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
            onRetry={() => void onRefresh()}
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => <LeaveCard leave={item} onPress={() => openLeave(item)} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              <LeaveState
                icon="calendar-blank-outline"
                title={filter === 'ALL' ? `No leave in ${year}` : `Nothing ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}`}
                body={
                  filter === 'ALL'
                    ? 'Nothing was applied for in this year. Use the year arrows to look at another one.'
                    : `You have leave in ${year}, but none of it is ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}.`
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

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  yearWrap: { marginHorizontal: 20, marginBottom: 4 },

  chipStrip: { flexGrow: 0, maxHeight: 58 },
  chipRow: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
});

export default LeaveHistoryScreen;
