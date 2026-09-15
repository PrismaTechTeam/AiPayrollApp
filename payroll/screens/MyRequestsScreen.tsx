/**
 * My Requests
 * The employee's own requests, newest first, filtered by status. Each card says
 * what was asked, where it stands, and whether HR has answered or sent a file
 * back — so the list alone tells you whether there is anything to look at.
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
import { BottomNavBar, BOTTOM_NAV_HEIGHT } from '../components/BottomNavBar';
import { useDialog } from '../components/ui/AppDialog';
import requestService, { EmployeeRequest } from '../api/services/requestService';
import { serverMessage } from '../lib/serverMessage';
import { StatusPill, shortDate, statusOf } from '../components/requests/RequestUi';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export const MyRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

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
      setError(serverMessage(err, 'Could not load your requests. Pull down to try again.'));
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

  const cancel = async (request: EmployeeRequest) => {
    const ok = await dialog.confirm({
      title: 'Cancel this request?',
      message: `Your ${request.requestType} request will be withdrawn. You can submit a new one any time.`,
      confirmText: 'Yes, cancel',
      cancelText: 'Keep it',
      destructive: true,
      tone: 'warning',
    });
    if (!ok) return;

    try {
      await requestService.cancelApplication(request.id);
      await load();
    } catch (err) {
      await dialog.notify({
        title: 'Could not cancel',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  const renderCard = ({ item }: { item: EmployeeRequest }) => {
    const status = statusOf(item.status);
    const files = item.attachmentCount ?? 0;
    const replied = Boolean(item.hrReply);

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.8} accessibilityRole="button">
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.requestType}</Text>
          <StatusPill status={item.status} />
        </View>

        <Text style={styles.cardMeta}>
          Submitted {shortDate(item.createdAt)}
        </Text>

        {item.notes ? (
          <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
        ) : null}

        {status === 'REJECTED' && item.rejectionReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText} numberOfLines={2}>{item.rejectionReason}</Text>
          </View>
        ) : null}

        {(files > 0 || replied) ? (
          <View style={styles.badgeRow}>
            {files > 0 ? (
              <View style={styles.badge}>
                <MaterialCommunityIcons name="paperclip" size={14} color={C.body} />
                <Text style={styles.badgeText}>{files} {files === 1 ? 'file' : 'files'}</Text>
              </View>
            ) : null}
            {replied ? (
              <View style={[styles.badge, styles.badgeReply]}>
                <MaterialCommunityIcons name="message-text-outline" size={14} color={C.blue} />
                <Text style={[styles.badgeText, styles.badgeTextReply]}>HR replied</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {status === 'PENDING' ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => { void cancel(item); }}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close-circle-outline" size={16} color={C.danger} />
            <Text style={styles.cancelText}>Cancel request</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>My Requests</Text>
          </View>
        </View>

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

        {requests === null ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(r) => r.id}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons name={error ? 'wifi-off' : 'text-box-outline'} size={32} color={error ? C.danger : C.blue} />
                </View>
                <Text style={styles.emptyTitle}>
                  {error ? 'Could not load' : filter === 'ALL' ? 'No requests yet' : `Nothing ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}`}
                </Text>
                <Text style={styles.emptyBody}>
                  {error ?? 'Tap the button below to send your first request to HR.'}
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateRequest')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="New request"
        >
          <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      <BottomNavBar activeScreen="requests" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  filterStrip: { flexGrow: 0, maxHeight: 60 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
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

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: BOTTOM_NAV_HEIGHT + 90, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: C.ink },
  cardMeta: { fontSize: 12, color: C.body },
  cardNotes: { fontSize: 14, lineHeight: 20, color: C.body, marginTop: 8 },

  reasonBox: { backgroundColor: C.dangerBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: C.danger, marginBottom: 2 },
  reasonText: { fontSize: 13, lineHeight: 18, color: C.body },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEF2F7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeReply: { backgroundColor: '#E6EEFF' },
  badgeText: { fontSize: 12, fontWeight: '600', color: C.body },
  badgeTextReply: { color: C.blue, fontWeight: '700' },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.dangerLine,
    backgroundColor: C.dangerBg,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.danger },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  emptyBody: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: BOTTOM_NAV_HEIGHT + 14,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});

export default MyRequestsScreen;
