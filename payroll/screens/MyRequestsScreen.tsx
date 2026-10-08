/**
 * My Requests
 * The employee's own requests, newest first, filtered by status. Each card says
 * what was asked, where it stands, and whether HR has answered or a file is on
 * it — so the list alone tells you whether there is anything to look at.
 * Everything you can do to a request (cancel it, reply, add a file) is on its
 * own page; the cards stay one or two lines so a screenful shows most of them.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { BottomNavBar, useBottomNavSpace } from '../components/BottomNavBar';
import { useApproverAccess } from '../hooks/useApproverAccess';
import requestService, { EmployeeRequest } from '../api/services/requestService';
import { serverMessage } from '../lib/serverMessage';
import {
  ErrorBanner,
  ListState,
  RequestHeader,
  STATUS_LOOK,
  StatusPill,
  shortDate,
  statusOf,
} from '../components/requests/RequestUi';

// No Draft tab: nothing creates drafts any more, and the few that exist from
// before still show under All with their own pill.
const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export const MyRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  // The button sits at the right, clear of the Punch circle; the list's last
  // row spans the width, so it also clears the circle and the button.
  const barSpace = useBottomNavSpace();
  const access = useApproverAccess();
  const approver = access.ready && access.requests;

  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [requests, setRequests] = useState<EmployeeRequest[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch once and filter on the phone. The list is one page of the employee's
  // own requests, so re-querying per tab buys nothing and makes the tabs feel slow.
  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await requestService.getApplications({ pageSize: 100 });
      setRequests(result.items ?? []);
    } catch (err) {
      setRequests((prev) => prev ?? []);
      setError(serverMessage(err, 'Could not load your requests.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const retry = () => {
    setRequests(null);
    void load();
  };

  const visible = useMemo(() => {
    const list = requests ?? [];
    return filter === 'ALL' ? list : list.filter((r) => statusOf(r.status) === filter);
  }, [requests, filter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: (requests ?? []).length };
    (requests ?? []).forEach((r) => {
      const key = statusOf(r.status);
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [requests]);

  const openDetail = (request: EmployeeRequest) => {
    navigation.navigate('RequestDetails', { requestId: request.id });
  };

  const renderCard = ({ item }: { item: EmployeeRequest }) => {
    const status = statusOf(item.status);
    const files = item.attachmentCount ?? 0;
    const replied = Boolean(item.hrReply);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDetail(item)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${item.requestType}, ${STATUS_LOOK[status].label}`}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.requestType}</Text>
          <StatusPill status={item.status} />
        </View>

        <Text style={styles.cardMeta} numberOfLines={1}>
          {shortDate(item.createdAt)}
          {files > 0 ? ` · ${files} ${files === 1 ? 'file' : 'files'}` : ''}
          {replied ? <Text style={styles.cardMetaReply}> · HR replied</Text> : null}
        </Text>

        {status === 'REJECTED' && item.rejectionReason ? (
          <Text style={styles.cardReason} numberOfLines={1}>{item.rejectionReason}</Text>
        ) : item.notes ? (
          <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const filterLabel = FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <RequestHeader
          title="My Requests"
          onBack={() => navigation.goBack()}
          right={
            // For an approver this tab is their own requests; the ones waiting
            // on them are one tap away rather than back on Home.
            approver ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('Requests', undefined, { pop: true })}
                style={styles.headerLink}
                accessibilityRole="button"
                accessibilityLabel="Requests to approve"
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <MaterialCommunityIcons name="text-box-check-outline" size={16} color={C.blue} />
                <Text style={styles.headerLinkText}>Approvals</Text>
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

        {error && (requests ?? []).length > 0 ? <ErrorBanner message={error} onRetry={() => { void load(); }} /> : null}

        {requests === null ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(r) => r.id}
            renderItem={renderCard}
            contentContainerStyle={[styles.list, { paddingBottom: barSpace + 80 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              error ? (
                <ListState
                  icon="wifi-off"
                  tone="danger"
                  title="Could not load your requests"
                  body={error}
                  actionLabel="Try again"
                  onAction={retry}
                />
              ) : filter === 'ALL' ? (
                <ListState icon="text-box-outline" title="No requests yet" body="Tap New request to send your first one to HR." />
              ) : (
                <ListState
                  icon="text-box-search-outline"
                  title={`No ${filterLabel} requests`}
                  body={`Requests you send will show here once they are ${filterLabel}.`}
                />
              )
            }
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { bottom: barSpace + 14 }]}
          onPress={() => navigation.navigate('CreateRequest')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="New request"
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          <Text style={styles.fabText}>New request</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <BottomNavBar activeScreen="requests" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E6EEFF',
  },
  headerLinkText: { fontSize: 13, fontWeight: '700', color: C.blue },

  filterStrip: { flexGrow: 0, maxHeight: 52 },
  filterRow: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 2, gap: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.ink },
  cardMeta: { fontSize: 12, color: C.body, marginTop: 4 },
  cardMetaReply: { color: C.blue, fontWeight: '700' },
  cardNotes: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 4 },
  cardReason: { fontSize: 13, lineHeight: 18, color: C.danger, marginTop: 4 },

  fab: {
    position: 'absolute',
    right: 16,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.blue,
    shadowColor: C.blue,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default MyRequestsScreen;
