/**
 * Punch Requests — the punches the employee asked HR to add.
 *
 * A missed clock-in is not fixed on the phone: the employee says when it really
 * happened and why, HR approves or rejects it on the web, and only an approved
 * one reaches the work card. This page is where the answer shows up, and where a
 * request still waiting can be taken back.
 *
 * Asking for a new one opens its own screen, the same split as My Leaves and
 * Apply for Leave.
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
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { LeaveState } from '../components/leave/LeaveUi';
import { PUNCH_LOOK, PunchRequestCard, punchWhenText } from '../components/attendance/PunchRequestUi';
import attendanceService, { PunchRequest } from '../api/services/attendanceService';
import { serverMessage } from '../lib/serverMessage';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; items: PunchRequest[] }
  | { kind: 'failed'; message: string };

export const PunchRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const alive = useRef(true);

  const fetchList = useCallback(async () => {
    try {
      const items = await attendanceService.getPunchRequests();
      if (!alive.current) return;
      setLoad({ kind: 'ready', items });
    } catch (err) {
      if (!alive.current) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your punch requests.') });
    }
  }, []);

  // Refreshes every time the page comes back into view, so a request sent from
  // the form is on the list the moment the form closes. A list already on screen
  // stays there while it refreshes instead of blinking to a spinner.
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setLoad((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }));
      void fetchList();
      return () => {
        alive.current = false;
      };
    }, [fetchList]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchList();
    if (alive.current) setRefreshing(false);
  }, [fetchList]);

  const retry = () => {
    setLoad({ kind: 'loading' });
    void fetchList();
  };

  const openNew = () => {
    navigation.navigate('CreatePunchRequest');
  };

  const withdraw = async (item: PunchRequest) => {
    const label = PUNCH_LOOK[item.punchType]?.label ?? 'Punch';
    const ok = await dialog.confirm({
      title: 'Withdraw this request?',
      message: `${label} · ${punchWhenText(item.punchTime)}`,
      confirmText: 'Withdraw',
      cancelText: 'Keep it',
      destructive: true,
    });
    if (!ok) return;

    setWithdrawingId(item.id);
    try {
      await attendanceService.cancelPunchRequest(item.id);
    } catch (err) {
      await dialog.notify({
        title: 'Could not withdraw it',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
    // Either way the list is re-read: a refusal usually means HR decided it a
    // moment ago, and the card should say so rather than keep offering Withdraw.
    await fetchList();
    if (alive.current) setWithdrawingId(null);
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
            <Text style={styles.headerTitle}>Punch Requests</Text>
            <Text style={styles.headerSubtitle}>Missed punches sent to HR</Text>
          </View>
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
              title="Could not load your requests"
              body={load.message}
              tone="danger"
              onRetry={retry}
            />
          ) : (
            <>
              <PrimaryButton icon="plus" label="New request" onPress={openNew} />

              <View style={styles.gap} />

              {load.items.length === 0 ? (
                <LeaveState
                  icon="clock-check-outline"
                  title="No requests yet"
                  body="Missed a clock in or out? Send HR the time."
                />
              ) : (
                load.items.map((item) => (
                  <PunchRequestCard
                    key={item.id}
                    item={item}
                    onWithdraw={() => { void withdraw(item); }}
                    withdrawing={withdrawingId === item.id}
                  />
                ))
              )}
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

  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  gap: { height: 20 },
});

export default PunchRequestsScreen;
