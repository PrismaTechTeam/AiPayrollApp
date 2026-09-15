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
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import leaveService, { LeaveApplication, MyLeaveEntitlement } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import {
  EntitlementRow,
  LeaveCard,
  LeaveState,
  SectionHeading,
  YearBar,
  annualEntitlement,
  dayNumber,
  goTo,
} from '../components/leave/LeaveUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; items: MyLeaveEntitlement[]; latest: LeaveApplication | null }
  | { kind: 'failed'; message: string };

export const MyLeavesScreen: React.FC = () => {
  const navigation = useNavigation();
  const thisYear = useRef(new Date().getFullYear()).current;

  const [year, setYear] = useState(thisYear);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const fetchYear = useCallback(async (target: number) => {
    try {
      // Both halves of the page, one round trip each, in parallel — the
      // entitlement list must not wait on the latest application to render.
      const [entitlements, applications] = await Promise.all([
        leaveService.getMyEntitlements(target),
        leaveService.getApplications({ page: 1, pageSize: 1, year: target }),
      ]);
      if (!alive.current) return;
      setLoad({
        kind: 'ready',
        items: entitlements.items,
        latest: applications.items[0] ?? null,
      });
    } catch (err) {
      if (!alive.current) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your leave.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setLoad({ kind: 'loading' });
      void fetchYear(year);
      return () => {
        alive.current = false;
      };
    }, [fetchYear, year]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchYear(year);
    if (alive.current) setRefreshing(false);
  }, [fetchYear, year]);

  /**
   * The one balance worth putting in the header — annual leave, named as such.
   *
   * It used to be every entitled type added together, which produced "43 days
   * left" out of annual plus sick plus hospitalisation plus compassionate. No
   * employee can book 43 days of anything; most of that total is leave they
   * hope never to use, and raw float addition made "12.500000000000002"
   * reachable on top of it. One type, its own name, its available figure.
   */
  const headline = useMemo(() => {
    if (load.kind !== 'ready') return null;
    return annualEntitlement(load.items);
  }, [load]);

  const openHistory = () => {
    goTo(navigation, 'LeaveHistory', { year });
  };

  const openApply = () => {
    goTo(navigation, 'CreateLeave');
  };

  const openType = (item: MyLeaveEntitlement) => {
    goTo(navigation, 'LeaveType', {
      leaveTypeId: item.leaveTypeId,
      leaveTypeName: item.description,
      year,
    });
  };

  const openLeave = (leave: LeaveApplication) => {
    goTo(navigation, 'LeaveDetails', { leaveId: leave.id, canApprove: false });
  };

  // Pulled out of the union so the card's onPress closes over a value TypeScript
  // has already narrowed, instead of re-checking it with a cast.
  const latest = load.kind === 'ready' ? load.latest : null;

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
            <Text style={styles.headerTitle}>My Leaves</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {headline === null
                ? 'Your leave, year by year'
                : `${dayNumber(headline.availableDays)} days of ${headline.description} available in ${year}`}
            </Text>
          </View>
        </View>

        <View style={styles.yearWrap}>
          <YearBar year={year} maxYear={thisYear} onChange={setYear} />
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
              title="Could not load your leave"
              body={load.message}
              tone="danger"
              onRetry={() => void onRefresh()}
            />
          ) : (
            <>
              {/* The reason most people open this page. Above the numbers, because
                  wanting time off is what brought them here — the balance is what
                  they check on the way. */}
              <PrimaryButton icon="calendar-plus" label="Apply for Leave" onPress={openApply} />

              <View style={styles.gap} />

              <SectionHeading
                title="LATEST LEAVE"
                actionLabel={load.latest ? 'View All' : undefined}
                onAction={load.latest ? openHistory : undefined}
              />
              {latest ? (
                <LeaveCard leave={latest} onPress={() => openLeave(latest)} />
              ) : (
                <View style={styles.quietCard}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={C.muted} />
                  <Text style={styles.quietText}>You have not applied for any leave in {year}.</Text>
                </View>
              )}

              <View style={styles.gap} />

              <SectionHeading title="LEAVE ENTITLEMENT" />
              {load.items.length === 0 ? (
                <View style={styles.quietCard}>
                  <MaterialCommunityIcons name="information-outline" size={20} color={C.muted} />
                  <Text style={styles.quietText}>
                    No leave types are set up for you in {year}. HR assigns these.
                  </Text>
                </View>
              ) : (
                <View style={styles.panel}>
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

  yearWrap: { marginHorizontal: 20, marginBottom: 14 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  gap: { height: 24 },

  panel: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14 },

  quietCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  quietText: { flex: 1, fontSize: 13, color: C.body },
});

export default MyLeavesScreen;
