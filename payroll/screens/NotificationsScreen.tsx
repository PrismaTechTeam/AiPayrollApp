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
 *
 * The list holds the person's notifications from every company they belong to.
 * One from another company offers to switch and open it in one step.
 *
 * It is a work screen like All services: the flat page, a centred title, white
 * bordered cards. "Mark all read" is an icon in the header that exists only
 * while something is unread, and "Clear all" waits at the end of the list, so
 * the first notification starts right under the title instead of under a row
 * of buttons, one of which was usually greyed out.
 */
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { Busy, DocumentState } from '../components/documents/DocumentUi';
import { useDialog } from '../components/ui/AppDialog';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { serverMessage } from '../lib/serverMessage';
import notificationService, { NotificationItem, notificationTarget } from '../api/services/notificationService';
import type { IconName } from '../components/auth/PrimaryButton';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'failed'; message: string };

type Kind = 'leave' | 'claim' | 'payslip' | 'attendance' | 'request' | 'training' | 'general';

/** One page of the list. The rest arrives as the person scrolls to the end. */
const PAGE_SIZE = 30;

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

// The icon alone says what a notification is about; every one sits on the same soft blue wash
// in navy, like the tiles on All services. Blue is kept for the unread dot.
const LOOK: Record<Kind, { icon: IconName; fg: string; bg: string }> = {
  leave: { icon: 'calendar-clock-outline', fg: C.ink, bg: C.blueSoft },
  claim: { icon: 'receipt-text-outline', fg: C.ink, bg: C.blueSoft },
  payslip: { icon: 'wallet-outline', fg: C.ink, bg: C.blueSoft },
  attendance: { icon: 'clock-check-outline', fg: C.ink, bg: C.blueSoft },
  request: { icon: 'text-box-outline', fg: C.ink, bg: C.blueSoft },
  training: { icon: 'school-outline', fg: C.ink, bg: C.blueSoft },
  general: { icon: 'bell-outline', fg: C.ink, bg: C.blueSoft },
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
  // Malaysia time whatever the phone is set to, and the year once it is not this one, so last
  // March's "3 Mar" cannot pass for this March's.
  const date = new Date(then);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kuala_Lumpur',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user, switchCompany } = usePayrollAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [opening, setOpening] = useState<number | null>(null);
  const alive = useRef(true);
  const page = useRef(1);
  const loadedOnce = useRef(false);
  // The last page came back short: there is nothing further. Counting rows against totalCount
  // alone never stopped, because rows that shift onto the next page while the list is open are
  // dropped as duplicates, so the count of rows shown never reached the total.
  const done = useRef(false);

  /**
   * 'replace' starts the list over (first load, pull to refresh). 'merge' is coming back from an
   * item: the person may be deep in page three, and starting over shrank the list to thirty rows
   * and threw away their place every time they pressed Back. It puts anything new on top and
   * refreshes the counts, and leaves the pages already loaded alone.
   */
  const fetch = useCallback(async (mode: 'replace' | 'merge' = 'replace') => {
    try {
      const result = await notificationService.getList({ page: 1, pageSize: PAGE_SIZE });
      if (!alive.current) return;
      const first = result.items ?? [];
      if (mode === 'merge') {
        const fresh = new Set(first.map((n) => n.id));
        setItems((prev) => [...first, ...prev.filter((n) => !fresh.has(n.id))]);
      } else {
        page.current = 1;
        done.current = first.length < PAGE_SIZE;
        setItems(first);
        setMore('idle');
      }
      loadedOnce.current = true;
      setTotal(result.totalCount ?? 0);
      setUnread(result.unreadCount ?? 0);
      setLoad({ kind: 'ready' });
    } catch (err) {
      if (!alive.current) return;
      // A failed refresh behind a list already on screen keeps that list; only a load with
      // nothing to show turns into the failed state.
      if (mode === 'merge') return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your notifications.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void fetch(loadedOnce.current ? 'merge' : 'replace');
      return () => { alive.current = false; };
    }, [fetch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    if (alive.current) setRefreshing(false);
  }, [fetch]);

  // Only the first page used to be fetched, so anything older than the fiftieth notification
  // could never be reached at all.
  const loadMore = async () => {
    if (load.kind !== 'ready' || more === 'loading' || done.current || items.length >= total) return;
    setMore('loading');
    try {
      const next = page.current + 1;
      const result = await notificationService.getList({ page: next, pageSize: PAGE_SIZE });
      if (!alive.current) return;
      page.current = next;
      done.current = (result.items ?? []).length < PAGE_SIZE;
      // New notifications arriving meanwhile shift the pages; skip any row already shown.
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...(result.items ?? []).filter((n) => !seen.has(n.id))];
      });
      setTotal(result.totalCount ?? 0);
      setUnread(result.unreadCount ?? 0);
      setMore('idle');
    } catch {
      if (alive.current) setMore('failed');
    }
  };

  // Marked read optimistically: the row is already open in front of the person,
  // so waiting on a round trip to un-bold it only looks broken. Then it opens
  // the request, claim or leave it is about.
  const openItem = async (item: NotificationItem) => {
    if (opening !== null) return;
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setUnread((n) => Math.max(0, n - 1));
      notificationService.markAsRead(item.id).catch(() => {
        // Left as read on screen. A failed mark is invisible and harmless; it
        // corrects itself on the next load.
      });
    }

    const target = notificationTarget(item.type, item.relatedId);
    if (!target) return;

    const itemTenant = item.tenantId?.toLowerCase() ?? null;
    if (itemTenant && user?.tenantId && itemTenant !== user.tenantId.toLowerCase()) {
      // It belongs to another of the person's companies. Telling them to go and switch first was a
      // five-step detour for something the app can do in one.
      const company = (user.availableTenants ?? []).find((t) => t.id.toLowerCase() === itemTenant);
      if (!company) {
        await dialog.notify({
          title: 'Not in your companies any more',
          message: 'This is from a company you are no longer a member of, so it cannot be opened.',
          tone: 'info',
        });
        return;
      }
      const ok = await dialog.confirm({
        title: `Open in ${company.name}?`,
        message: `This is from ${company.name}. The app will switch to that company.`,
        confirmText: 'Switch and open',
        cancelText: 'Stay here',
      });
      if (!ok) return;
      setOpening(item.id);
      try {
        await switchCompany(company.id);
      } catch (err) {
        await dialog.notify({ title: 'Could not switch company', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        return;
      } finally {
        if (alive.current) setOpening(null);
      }
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
      done.current = true;
      setItems([]);
      setTotal(0);
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
    const opensSomething = notificationTarget(item.type, item.relatedId) !== null;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => { void openItem(item); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.title ? `${item.title}. ` : ''}${item.message}. ${timeAgo(item.createdAt)}${item.isRead ? '' : '. Unread'}`}
      >
        <View style={[styles.rowIcon, { backgroundColor: look.bg }]}>
          <MaterialCommunityIcons name={look.icon} size={20} color={look.fg} />
        </View>
        <View style={styles.rowBody}>
          {item.title ? (
            <Text style={[styles.rowTitle, !item.isRead && styles.rowTextUnread]}>{item.title}</Text>
          ) : null}
          <Text style={[styles.rowText, !item.isRead && !item.title && styles.rowTextUnread]}>{item.message}</Text>
          <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {opening === item.id ? (
          <ActivityIndicator size="small" color={C.blue} />
        ) : !item.isRead ? (
          <View style={styles.unreadDot} />
        ) : opensSomething ? (
          <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
        ) : null}
      </TouchableOpacity>
    );
  };

  const subtitle =
    load.kind !== 'ready' ? null
      : unread > 0 ? `${unread} unread`
      : items.length > 0 ? 'You are up to date'
      : null;

  const footer =
    more === 'loading' ? (
      <View style={styles.footer}>
        <ActivityIndicator color={C.blue} />
      </View>
    ) : more === 'failed' ? (
      <TouchableOpacity style={styles.footerRetry} onPress={() => { setMore('idle'); void loadMore(); }} accessibilityRole="button">
        <Text style={styles.footerRetryText}>Could not load older ones. Try again</Text>
      </TouchableOpacity>
    ) : items.length > 0 ? (
      // At the end of the list rather than at the top: it is rare and cannot be undone, so it
      // should not cost space above every notification or sit where a thumb lands by accident.
      <TouchableOpacity style={styles.footerClear} onPress={() => { void clearAll(); }} accessibilityRole="button">
        <Text style={styles.footerClearText}>Clear all notifications</Text>
      </TouchableOpacity>
    ) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Notifications</Text>
            {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
          </View>
          {/* Only while something is unread: a greyed-out "Mark all read" was a control that did nothing. */}
          {load.kind === 'ready' && unread > 0 ? (
            <TouchableOpacity
              onPress={() => { void markAll(); }}
              style={styles.headerAction}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <MaterialCommunityIcons name="check-all" size={24} color={C.ink} />
            </TouchableOpacity>
          ) : null}
        </View>

        {load.kind === 'loading' ? (
          <Busy />
        ) : load.kind === 'failed' ? (
          <DocumentState
            icon="cloud-off-outline"
            title="Could not load your notifications"
            body={load.message}
            tone="danger"
            // The spinner replaces the button while it asks, so nobody taps it into a pile of
            // parallel requests (this API answers bursts with 429).
            onRetry={() => { setLoad({ kind: 'loading' }); void fetch(); }}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            onEndReached={() => { if (more === 'idle') void loadMore(); }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={footer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
            }
            ListEmptyComponent={
              <DocumentState
                icon="bell-check-outline"
                title="Nothing new"
                body="Approvals, replies and reminders will show up here."
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

  header: { minHeight: 52, paddingHorizontal: 8, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.body, marginTop: 1 },
  // 44pt: the minimum a thumb can hit reliably. Mirrors the back arrow on the other side.
  headerAction: { position: 'absolute', right: 8, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 10 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  // The same white card as the approval lists: radius 16, hairline border, a shadow you barely see.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: C.ink,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // Unread is carried by the blue dot and the bold title. The 3pt blue edge it also had bent
  // round the card's corner and pushed the text 3pt out of line with the read rows.
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowText: { fontSize: 13, lineHeight: 19, color: C.body },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  rowTextUnread: { color: C.ink, fontWeight: '700' },
  rowTime: { fontSize: 12, color: C.muted, marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.blue },

  footer: { paddingVertical: 16, alignItems: 'center' },
  footerRetry: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  footerRetryText: { fontSize: 13, fontWeight: '700', color: C.blue },
  footerClear: { minHeight: 44, marginTop: 4, justifyContent: 'center', alignItems: 'center' },
  footerClearText: { fontSize: 13, fontWeight: '600', color: C.danger },
});

export default NotificationsScreen;
