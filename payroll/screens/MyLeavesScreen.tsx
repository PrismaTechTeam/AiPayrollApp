/**
 * My Leaves — what the employee has left, and what they last took.
 *
 * Two facts, in the order people ask for them. "Did my leave go through?" is
 * answered by the card at the top; "how many days do I have left?" by the list
 * under it. Everything else — the full history, and when a particular leave was
 * used — is one tap away rather than crammed onto this page.
 *
 * Applying is the one action on the page, and it opens its own screen rather
 * than unfolding here: mixing a form into the page that answers "how many days
 * do I have" is what made the old version unreadable. It was reachable only
 * from Search, which is nowhere near where anyone looks for it.
 *
 * Sized to fit one phone screen: the year switcher sits on the entitlement
 * heading it belongs to instead of a bar of its own, and coming back from a
 * leave refreshes the numbers in place instead of blanking the page to a
 * spinner and throwing away the scroll position.
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { BottomNavBar, useBottomNavSpace } from '../components/BottomNavBar';
import { useDialog } from '../components/ui/AppDialog';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import leaveService, { LeaveApplication, MyLeaveEntitlement } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import {
  EntitlementRow,
  LeaveCard,
  LeaveHeader,
  LeaveState,
  SectionHeading,
  YearBar,
  annualEntitlement,
  dayText,
} from '../components/leave/LeaveUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; year: number; items: MyLeaveEntitlement[]; latest: LeaveApplication | null }
  | { kind: 'failed'; message: string };

/**
 * Why a read was started, which decides what its failure does. Only the first
 * read may replace the page with an error; a later one that fails leaves the
 * numbers already on screen alone.
 */
type Mode = 'initial' | 'focus' | 'refresh' | 'year';

export const MyLeavesScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user, employee } = usePayrollAuth();
  const canApproveLeave = useApproverAccess().leave;
  // HR added straight to the company has no employee record, so there is no
  // leave of theirs to read; asking anyway only earns a 403 telling HR to
  // "join a company", with a Try again that can never succeed.
  const linked = Boolean(user?.employeeId ?? employee?.id);
  const thisYear = useRef(new Date().getFullYear()).current;
  // This page is the bar's Leave tab, so the bar stays on it; the last row must clear
  // the bar, the home indicator and the Punch circle that rises out of it.
  const navSpace = useBottomNavSpace(!!user?.employeeId);

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [switchingTo, setSwitchingTo] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Read inside callbacks without becoming their dependencies, so returning to
  // the page refreshes what is there rather than restarting it.
  const loadRef = useRef(load);
  loadRef.current = load;
  const wantedYear = useRef(thisYear);
  const focused = useRef(false);
  // Only the newest read may write. A year tapped twice quickly, or a focus
  // refresh overtaking a slow one, would otherwise let the older answer land last.
  const seq = useRef(0);

  const show = useCallback(async (target: number, mode: Mode) => {
    const mine = ++seq.current;
    wantedYear.current = target;
    if (mode === 'initial') setLoad({ kind: 'loading' });
    if (mode === 'year') setSwitchingTo(target);
    try {
      // Both halves in parallel. The latest leave is not filtered by year: it is
      // the newest application whatever its dates, so a January booking made in
      // October is the card on top instead of vanishing until January.
      const [entitlements, applications] = await Promise.all([
        leaveService.getMyEntitlements(target),
        leaveService.getApplications({ page: 1, pageSize: 1 }),
      ]);
      if (mine !== seq.current) return;
      setLoad({ kind: 'ready', year: target, items: entitlements.items, latest: applications.items[0] ?? null });
    } catch (err) {
      if (mine !== seq.current) return;
      const message = serverMessage(err, 'Could not load your leave.');
      if (mode === 'initial' || loadRef.current.kind !== 'ready') {
        setLoad({ kind: 'failed', message });
      } else if ((mode === 'year' || mode === 'refresh') && focused.current) {
        // The page keeps the year it had, so the numbers never belong to a
        // different year from the one printed above them.
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

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (linked) {
        const current = loadRef.current;
        void show(current.kind === 'ready' ? current.year : wantedYear.current, current.kind === 'ready' ? 'focus' : 'initial');
      }
      return () => {
        focused.current = false;
      };
    }, [linked, show]),
  );

  const year = load.kind === 'ready' ? load.year : wantedYear.current;

  // Always cleared, even if the page was left mid-refresh: the old code only
  // cleared it while focused, so the spinner was still turning on return.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await show(year, 'refresh');
    setRefreshing(false);
  }, [show, year]);

  /**
   * The one balance worth putting in the header — annual leave, named as such.
   *
   * It used to be every entitled type added together, which produced "43 days
   * left" out of annual plus sick plus hospitalisation plus compassionate. No
   * employee can book 43 days of anything; most of that total is leave they
   * hope never to use. One type, its own name, its available figure.
   */
  const headline = load.kind === 'ready' ? annualEntitlement(load.items) : null;
  const subtitle = headline
    ? `${dayText(headline.availableDays)} of ${headline.description} available${year === thisYear ? '' : ` in ${year}`}`
    : null;

  // Pulled out of the union so the card's onPress closes over a value TypeScript
  // has already narrowed, instead of re-checking it with a cast.
  const latest = load.kind === 'ready' ? load.latest : null;

  // History opens on the year of the leave just shown, which may be next year.
  const openHistory = () => {
    const leaveYear = latest ? Number((latest.startDate ?? '').slice(0, 4)) : NaN;
    navigation.navigate('LeaveHistory', { year: Number.isFinite(leaveYear) && leaveYear > 0 ? leaveYear : year });
  };

  const openType = (item: MyLeaveEntitlement) => {
    navigation.navigate('LeaveType', { leaveTypeId: item.leaveTypeId, description: item.description, year });
  };

  const openLeave = (leave: LeaveApplication) => {
    navigation.navigate('LeaveDetails', { leaveId: leave.id });
  };

  const body = () => {
    if (!linked) {
      return (
        <LeaveState
          icon="account-off-outline"
          title="No personal leave on this account"
          body={canApproveLeave
            ? 'This sign-in has no employee record, so it has no leave of its own. Leave to decide is in Leave Approval.'
            : 'This sign-in has no employee record yet. Ask HR to link it to you.'}
          onRetry={canApproveLeave ? () => navigation.navigate('Leaves') : undefined}
          actionLabel="Open Leave Approval"
        />
      );
    }

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
          title="Could not load your leave"
          body={load.message}
          tone="danger"
          onRetry={() => { void show(wantedYear.current, 'initial'); }}
        />
      );
    }

    return (
      <>
        {/* The reason most people open this page. Above the numbers, because
            wanting time off is what brought them here — the balance is what
            they check on the way. */}
        <PrimaryButton icon="calendar-plus" label="Apply for Leave" onPress={() => navigation.navigate('CreateLeave')} compact />

        <View style={styles.gap} />

        <SectionHeading
          title="LATEST LEAVE"
          actionLabel={latest ? 'View all' : undefined}
          onAction={latest ? openHistory : undefined}
        />
        {latest ? (
          <LeaveCard leave={latest} onPress={() => openLeave(latest)} />
        ) : (
          <View style={styles.quietCard}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={C.muted} />
            <Text style={styles.quietText}>You have not applied for any leave yet.</Text>
          </View>
        )}

        <View style={styles.gap} />

        <SectionHeading
          title="ENTITLEMENT"
          right={(
            <YearBar
              compact
              year={year}
              maxYear={thisYear + 1}
              onChange={(next) => { void show(next, 'year'); }}
              busy={switchingTo !== null}
            />
          )}
        />
        {load.items.length === 0 ? (
          <View style={[styles.quietCard, switchingTo !== null && styles.dim]}>
            <MaterialCommunityIcons name="information-outline" size={20} color={C.muted} />
            <Text style={styles.quietText}>No leave types are set up for you in {year}. HR assigns these.</Text>
          </View>
        ) : (
          <View style={[styles.panel, switchingTo !== null && styles.dim]}>
            {load.items.map((item, index) => (
              <EntitlementRow
                key={item.leaveTypeId}
                item={item}
                onPress={() => openType(item)}
                last={index === load.items.length - 1}
              />
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

      <SafeAreaView style={styles.flex} edges={['top']}>
        <LeaveHeader title="My Leaves" subtitle={subtitle} onBack={() => navigation.goBack()} />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: navSpace + 12 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={linked && load.kind === 'ready'
            ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />
            : undefined}
        >
          {body()}
        </ScrollView>
      </SafeAreaView>

      {/* Outside the safe area: the bar pads itself for the home indicator. */}
      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  gap: { height: 12 },
  dim: { opacity: 0.45 },

  panel: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14 },

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

export default MyLeavesScreen;
