/**
 * Notifications.
 *
 * Rebuilt from the Material prototype. Three of its four failure paths went
 * through Alert.alert, which is banned here for a reason that bites on this
 * screen in particular: "Clear all" is destructive and irreversible, and
 * Alert's confirm on Android is a different shape from every other confirm in
 * the app.
 *
 * The other change is honesty about failure. The prototype swallowed a failed
 * load into console.error and then rendered the empty state, so an outage and
 * an empty inbox looked identical -- the one moment you must not tell somebody
 * "nothing to see" is when you do not know. Loading, failed and empty are three
 * states here, and only one of them claims there is no news.
 */
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { Busy, DocumentState } from '../components/documents/DocumentUi';
import { useDialog } from '../components/ui/AppDialog';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { serverMessage } from '../lib/serverMessage';
import notificationService, { NotificationItem } from '../api/services/notificationService';
import type { IconName } from '../components/auth/PrimaryButton';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'failed'; message: string };

type Kind = 'leave' | 'claim' | 'payslip' | 'attendance' | 'request' | 'training' | 'general';

/**
 * What the notification is about. Newer notifications carry a type from the server (leave_approved,
 * claim_rejected, request_reply, ...); older ones are one free-text line, so the icon falls back to
 * the wording. The message is always shown in full, so a wrong guess costs nothing.
 */
function kindOf(item: NotificationItem): Kind {
  const t = (item.type ?? '').toLowerCase();
  if (t.startsWith('leave_')) return 'leave';
  if (t.startsWith('claim_')) return 'claim';
  if (t.startsWith('request_')) return 'request';
  const m = item.message.toLowerCase();
  if (m.includes('leave')) return 'leave';
  if (m.includes('claim')) return 'claim';
  if (m.includes('payslip') || m.includes('salary') || m.includes('payroll')) return 'payslip';
  if (m.includes('attendance') || m.includes('clock') || m.includes('check in') || m.includes('check-in')) return 'attendance';
  if (m.includes('training') || m.includes('course') || m.includes('certificate')) return 'training';
  if (m.includes('request')) return 'request';
  return 'general';
}

/** The screen a notification opens, or null for ones that are only news (and all older ones). */
function destinationOf(item: NotificationItem): { screen: string; params: object } | null {
  const id = item.relatedId;
  const type = item.type ?? '';
  if (!id) return null;
  // HR is told an employee answered on a request, so it opens as the approver.
  if (type === 'request_employee_reply') return { screen: 'RequestDetails', params: { requestId: id, canApprove: true } };
  if (type.startsWith('request_')) return { screen: 'RequestDetails', params: { requestId: id } };
  if (type.startsWith('claim_')) return { screen: 'ClaimDetails', params: { claimId: id } };
  if (type.startsWith('leave_')) return { screen: 'LeaveDetails', params: { leaveId: id } };
  return null;
}

const LOOK: Record<Kind, { icon: IconName; fg: string; bg: string }> = {
  leave: { icon: 'calendar-clock-outline', fg: '#7C3AED', bg: '#F1EAFE' },
  claim: { icon: 'receipt-text-outline', fg: '#D97706', bg: '#FFF4E5' },
  payslip: { icon: 'wallet-outline', fg: '#16A34A', bg: '#E7F7EE' },
  attendance: { icon: 'clock-check-outline', fg: '#0891B2', bg: '#E0F5F8' },
  request: { icon: 'text-box-outline', fg: C.blue, bg: '#E8F0FE' },
  training: { icon: 'school-outline', fg: '#0D9488', bg: '#E4F6F4' },
  general: { icon: 'bell-outline', fg: '#64748B', bg: '#EEF2F7' },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(then).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user } = usePayrollAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const fetch = useCallback(async () => {
    try {
      const result = await notificationService.getList({ page: 1, pageSize: 50 });
      if (!alive.current) return;
      setItems(result.items ?? []);
      setUnread(result.unreadCount ?? 0);
      setLoad({ kind: 'ready' });
    } catch (err) {
      if (!alive.current) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your notifications.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void fetch();
      return () => { alive.current = false; };
    }, [fetch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    if (alive.current) setRefreshing(false);
  }, [fetch]);

  // Marked read optimistically: the row is already open in front of the person,
  // so waiting on a round trip to un-bold it only looks broken. Then it opens
  // the request, claim or leave it is about.
  const openItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setUnread((n) => Math.max(0, n - 1));
      try {
        await notificationService.markAsRead(item.id);
      } catch {
        // Left as read on screen. A failed mark is invisible and harmless; it
        // corrects itself on the next load.
      }
    }

    const target = destinationOf(item);
    if (!target) return;
    if (item.tenantId && user?.tenantId && item.tenantId !== user.tenantId) {
      await dialog.notify({
        title: 'This is in another company',
        message: 'Switch to that company first, then open it from here.',
        tone: 'info',
      });
      return;
    }
    (navigation.navigate as (screen: string, params: object) => void)(target.screen, target.params);
  };

  const markAll = async () => {
    const before = items;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      setItems(before);
      await fetch();
      await dialog.notify({
        title: 'Could not mark them read',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  const clearAll = async () => {
    const ok = await dialog.confirm({
      title: 'Clear all notifications?',
      message: 'This removes every notification from your list. It cannot be undone.',
      confirmText: 'Clear all',
      cancelText: 'Keep them',
      destructive: true,
    });
    if (!ok) return;
    try {
      await notificationService.clearAll();
      setItems([]);
      setUnread(0);
    } catch (err) {
      await dialog.notify({
        title: 'Could not clear them',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const look = LOOK[kindOf(item)];
    return (
      <TouchableOpacity
        style={[styles.row, !item.isRead && styles.rowUnread]}
        onPress={() => { void openItem(item); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.message}. ${timeAgo(item.createdAt)}${item.isRead ? '' : '. Unread'}`}
      >
        <View style={[styles.rowIcon, { backgroundColor: look.bg }]}>
          <MaterialCommunityIcons name={look.icon} size={22} color={look.fg} />
        </View>
        <View style={styles.rowBody}>
          {item.title ? (
            <Text style={[styles.rowTitle, !item.isRead && styles.rowTextUnread]}>{item.title}</Text>
          ) : null}
          <Text style={[styles.rowText, !item.isRead && styles.rowTextUnread]}>{item.message}</Text>
          <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    );
  };

  const subtitle =
    load.kind !== 'ready' ? 'What has happened while you were away'
      : unread > 0 ? `${unread} unread`
      : 'You are up to date';

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
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>

        {load.kind === 'ready' && items.length > 0 ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.action}
              onPress={() => { void markAll(); }}
              disabled={unread === 0}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="check-all" size={18} color={unread === 0 ? C.muted : C.blue} />
              <Text style={[styles.actionText, unread === 0 && styles.actionTextOff]}>Mark all read</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => { void clearAll(); }} accessibilityRole="button">
              <MaterialCommunityIcons name="broom" size={18} color={C.danger} />
              <Text style={[styles.actionText, styles.actionTextDanger]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {load.kind === 'loading' ? (
          <Busy />
        ) : load.kind === 'failed' ? (
          <DocumentState
            icon="cloud-off-outline"
            title="Could not load your notifications"
            body={load.message}
            tone="danger"
            onRetry={() => { void onRefresh(); }}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
            }
            ListEmptyComponent={
              <DocumentState
                icon="bell-check-outline"
                title="Nothing new"
                body="Approvals, payslips and reminders will show up here as they happen."
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

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: C.blue },
  actionTextOff: { color: C.muted },
  actionTextDanger: { color: C.danger },

  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  // Unread is carried by a tinted edge and a dot as well as by weight, so it
  // survives being read at arm's length in sunlight.
  rowUnread: { borderLeftWidth: 3, borderLeftColor: C.blue },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 4 },
  rowText: { fontSize: 14, lineHeight: 20, color: C.body },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 2 },
  rowTextUnread: { color: C.ink, fontWeight: '700' },
  rowTime: { fontSize: 12, color: C.muted },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.blue },
});

export default NotificationsScreen;
