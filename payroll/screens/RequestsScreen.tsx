/**
 * Request Approval
 * Every employee request in the company, for whoever can decide them. Approving
 * and rejecting happen here for speed; anything that needs reading — the notes,
 * the attached files, HR's reply — opens the detail screen.
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
  { key: 'PENDING', label: 'Pending' },
  { key: 'ALL', label: 'All' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const RequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [filter, setFilter] = useState<FilterKey>('PENDING');
  const [requests, setRequests] = useState<EmployeeRequest[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await requestService.getAllRequests({ pageSize: 100 });
      setRequests(result.items ?? []);
    } catch (err) {
      setRequests((prev) => prev ?? []);
      setError(serverMessage(err, 'Could not load requests. Pull down to try again.'));
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
    navigation.navigate('RequestDetails', { requestId: request.id, canApprove: true });
  };

  const approve = async (request: EmployeeRequest) => {
    const ok = await dialog.confirm({
      title: 'Approve this request?',
      message: `${request.employeeName ?? 'The employee'} will be told straight away.`,
      confirmText: 'Approve',
    });
    if (!ok) return;

    setActingOn(request.id);
    try {
      await requestService.approveRequest(request.id);
      await load();
    } catch (err) {
      await dialog.notify({ title: 'Could not approve', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setActingOn(null);
    }
  };

  const reject = async (request: EmployeeRequest) => {
    // Alert.prompt used to be the way in; it exists only on iOS, so rejecting
    // from this list did nothing at all on Android.
    const reason = await dialog.prompt({
      title: 'Reject this request',
      message: `${request.employeeName ?? 'The employee'} sees this, so say what would make it approvable.`,
      placeholder: 'Reason for rejection',
      confirmText: 'Reject',
      required: true,
      multiline: true,
      maxLength: 1000,
      destructive: true,
    });
    if (!reason) return;

    setActingOn(request.id);
    try {
      await requestService.rejectRequest(request.id, reason);
      await load();
    } catch (err) {
      await dialog.notify({ title: 'Could not reject', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setActingOn(null);
    }
  };

  const renderCard = ({ item }: { item: EmployeeRequest }) => {
    const busy = actingOn === item.id;
    const files = item.attachmentCount ?? 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)} activeOpacity={0.8} accessibilityRole="button">
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.employeeName)}</Text>
          </View>
          <View style={styles.cardHeadText}>
            <Text style={styles.cardName} numberOfLines={1}>{item.employeeName ?? 'Employee'}</Text>
            <Text style={styles.cardType} numberOfLines={1}>
              {item.requestTypeName || item.requestType}
              {item.employeeCode ? ` · ${item.employeeCode}` : ''}
            </Text>
          </View>
          <StatusPill status={item.status} />
        </View>

        <Text style={styles.cardMeta}>
          Submitted {shortDate(item.createdAt)}
        </Text>

        {item.notes ? <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text> : null}

        {(files > 0 || item.hrReply) ? (
          <View style={styles.badgeRow}>
            {files > 0 ? (
              <View style={styles.badge}>
                <MaterialCommunityIcons name="paperclip" size={14} color={C.body} />
                <Text style={styles.badgeText}>{files} {files === 1 ? 'file' : 'files'}</Text>
              </View>
            ) : null}
            {item.hrReply ? (
              <View style={[styles.badge, styles.badgeReply]}>
                <MaterialCommunityIcons name="message-text-outline" size={14} color={C.blue} />
                <Text style={[styles.badgeText, styles.badgeTextReply]}>Replied</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {statusOf(item.status) === 'PENDING' ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.action, styles.reject]}
              onPress={() => { void reject(item); }}
              disabled={busy}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="close" size={16} color={C.danger} />
              <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.action, styles.approve]}
              onPress={() => { void approve(item); }}
              disabled={busy}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionText, styles.approveText]}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
            <Text style={styles.headerTitle}>Request Approval</Text>
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
                  <MaterialCommunityIcons name={error ? 'wifi-off' : 'inbox-outline'} size={32} color={error ? C.danger : C.blue} />
                </View>
                <Text style={styles.emptyTitle}>
                  {error ? 'Could not load' : filter === 'PENDING' ? 'Nothing waiting' : 'Nothing here'}
                </Text>
                <Text style={styles.emptyBody}>
                  {error ?? (filter === 'PENDING' ? 'Every request has been decided.' : 'No requests match this filter.')}
                </Text>
              </View>
            }
          />
        )}
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
  list: { paddingHorizontal: 16, paddingBottom: BOTTOM_NAV_HEIGHT + 24, gap: 12 },

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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D8E6FB', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.blue },
  cardHeadText: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '800', color: C.ink },
  cardType: { fontSize: 13, color: C.body, marginTop: 2 },
  cardMeta: { fontSize: 12, color: C.body },
  cardNotes: { fontSize: 14, lineHeight: 20, color: C.body, marginTop: 8 },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEF2F7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  badgeReply: { backgroundColor: '#E6EEFF' },
  badgeText: { fontSize: 12, fontWeight: '600', color: C.body },
  badgeTextReply: { color: C.blue, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12 },
  reject: { borderWidth: 1, borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  approve: { backgroundColor: C.blue },
  actionText: { fontSize: 14, fontWeight: '700' },
  rejectText: { color: C.danger },
  approveText: { color: '#FFFFFF' },

  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8, marginTop: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  emptyBody: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center' },
});

export default RequestsScreen;
