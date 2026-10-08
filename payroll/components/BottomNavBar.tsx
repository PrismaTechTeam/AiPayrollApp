/**
 * Bottom Navigation Bar
 * A floating white pill with four labelled tabs and a raised Punch button in
 * the middle.
 *
 * Punch sits above the bar rather than in it because clocking in is the one
 * thing an employee does every single day, often in a hurry at a gate — it
 * should be the largest target on the screen and reachable without looking.
 *
 * Who sees what follows the person's employee record, not their role: anyone
 * linked to an employee in this company — HR included — punches, and Requests
 * and Leave open their OWN requests and leave. HR reaches approvals from Home.
 * Somebody with no employee record here (an owner or admin added straight to
 * the company) has no Punch, because there is nobody to clock in as; their bar
 * is an approvals bar instead — Requests, Claims and Leave open the three
 * approval lists, each only with its right, under approval icons, so nobody
 * mistakes the list for their own items.
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CommonActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { holdToastClearance, releaseToastClearance } from './ui/AppDialog';
import { AUTH_COLORS as C } from './auth/AuthBackdrop';
import type { IconName } from './auth/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';

// Routes with no params: a tab never hands its screen anything.
type TabScreen = Extract<
  keyof RootStackParamList,
  'PayrollHome' | 'Requests' | 'MyRequests' | 'Leaves' | 'MyLeaves' | 'ClaimsApproval' | 'AccountSettings' | 'AttendanceCheckIn'
>;

export type NavTab = 'home' | 'leave' | 'requests' | 'claims' | 'profile' | 'punch';

interface BottomNavBarProps {
  /**
   * Which tab to light up when the screen is not itself one of the tabs (a
   * detail page that shows the bar). A screen that IS a tab is worked out from
   * the route, so the highlight cannot disagree with where the tab goes.
   */
  activeScreen?: NavTab;
}

/**
 * The bar's height without a home indicator. Prefer useBottomNavSpace(), which
 * adds the inset the bar pads itself by.
 */
export const BOTTOM_NAV_HEIGHT = 84;

/** How far the Punch circle rises above the bar's top edge. */
const PUNCH_OVERHANG = 26;

/**
 * Space a scrolling page must keep free at the bottom so the bar never covers
 * its last row: the bar itself, the home indicator or Android's navigation bar
 * it pads itself by, and — when Punch is showing — the circle that rises out of
 * it in the middle.
 */
export function useBottomNavSpace(withPunch = false): number {
  const insets = useSafeAreaInsets();
  return BOTTOM_NAV_HEIGHT + Math.max(insets.bottom - 10, 0) + (withPunch ? PUNCH_OVERHANG : 0);
}

/** The approval lists. For somebody with an employee record they are reached from Home, so they light up Home. */
const REACHED_FROM_HOME = new Set<string>(['Requests', 'Leaves', 'ClaimsApproval']);

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = usePayrollAuth();
  const access = useApproverAccess();
  const linked = !!user?.employeeId;

  // While this screen is showing, the shared toast sits above the bar instead of under it.
  const toastOwner = useRef({}).current;
  const barSpace = useBottomNavSpace(linked);
  useFocusEffect(
    useCallback(() => {
      holdToastClearance(toastOwner, barSpace);
      return () => releaseToastClearance(toastOwner);
    }, [toastOwner, barSpace]),
  );

  // Somebody with no employee record has no requests or leave of their own; their tabs open the
  // approval lists instead, and only the ones the server will actually let them see.
  const requestsScreen: TabScreen | null = linked ? 'MyRequests' : access.ready && access.requests ? 'Requests' : null;
  const leaveScreen: TabScreen | null = linked ? 'MyLeaves' : access.ready && access.leave ? 'Leaves' : null;
  // Claims had no tab, so of the three approval lists only it lived on Home alone. It takes the
  // middle slot, which Punch fills for everybody with an employee record.
  const claimsScreen: TabScreen | null = !linked && access.ready && access.claims ? 'ClaimsApproval' : null;

  const tabs: { key: NavTab; label: string; icon: IconName; activeIcon: IconName; screen: TabScreen | null }[] = [
    { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home', screen: 'PayrollHome' },
    linked
      ? { key: 'requests', label: 'Requests', icon: 'text-box-outline', activeIcon: 'text-box', screen: requestsScreen }
      : { key: 'requests', label: 'Requests', icon: 'text-box-check-outline', activeIcon: 'text-box-check', screen: requestsScreen },
    { key: 'claims', label: 'Claims', icon: 'receipt-text-check-outline', activeIcon: 'receipt-text-check', screen: claimsScreen },
    // Leave, not Payslip: an employee opens leave many times a month and a
    // payslip once. Payslip keeps its tile on the home grid.
    linked
      ? { key: 'leave', label: 'Leave', icon: 'calendar-clock-outline', activeIcon: 'calendar-clock', screen: leaveScreen }
      : { key: 'leave', label: 'Leave', icon: 'calendar-check-outline', activeIcon: 'calendar-check', screen: leaveScreen },
    { key: 'profile', label: 'Profile', icon: 'account-outline', activeIcon: 'account', screen: 'AccountSettings' },
  ];

  const active: NavTab | undefined =
    tabs.find((t) => t.screen === route.name)?.key ??
    (route.name === 'AttendanceCheckIn' ? 'punch' : REACHED_FROM_HOME.has(route.name) ? 'home' : activeScreen);

  /**
   * Tabs, not pages: the stack under the bar is always Home plus at most one tab.
   *
   * navigate() in React Navigation 7 pushes a fresh copy of a screen that is
   * already further back, so every tab tap used to stack another page — Back
   * then walked through every tab ever tapped, and each extra Home ran its own
   * set of requests on focus. Now Home pops back to the Home already there, and
   * any other tab replaces whatever sits above Home.
   */
  const openTab = (screen: TabScreen) => {
    if (route.name === screen) return;
    navigation.dispatch((state) => {
      const homeIndex = state.routes.findIndex((r) => r.name === 'PayrollHome');
      if (homeIndex < 0) return CommonActions.navigate(screen);
      if (screen === 'PayrollHome') return CommonActions.navigate({ name: 'PayrollHome', pop: true });
      const kept = state.routes.slice(0, homeIndex + 1);
      const above = state.routes[homeIndex + 1];
      // The tab is already the page above Home (its own detail page is on top): go back to it
      // rather than opening a second one.
      if (above?.name === screen) return CommonActions.navigate({ name: screen, pop: true });
      return CommonActions.reset({
        ...state,
        routes: [...kept, { key: `${screen}-${Date.now()}`, name: screen, params: undefined }],
        index: kept.length,
      });
    });
  };

  const renderTab = (t: (typeof tabs)[number]) => {
    const target = t.screen;
    if (!target) return null;
    const on = active === t.key;
    return (
      <TouchableOpacity
        key={t.key}
        style={styles.item}
        onPress={() => openTab(target)}
        accessibilityRole="tab"
        accessibilityLabel={t.label}
        accessibilityState={{ selected: on }}
      >
        <View style={[styles.indicator, on && styles.indicatorOn]} />
        <MaterialCommunityIcons name={on ? t.activeIcon : t.icon} size={24} color={on ? C.blue : C.muted} />
        <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
          {t.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const punchActive = active === 'punch';

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        {/* Punch lives in the row so its label lines up with the others; only
            the circle is lifted out of the bar. Only for somebody linked to an
            employee record: without one there is nobody to clock in as, and
            the slot holds Claims instead. */}
        {linked ? (
          <TouchableOpacity
            onPress={() => openTab('AttendanceCheckIn')}
            activeOpacity={0.85}
            style={styles.punchItem}
            accessibilityRole="button"
            accessibilityLabel="Punch in or out"
            accessibilityState={{ selected: punchActive }}
          >
            <View style={styles.punchRing}>
              <LinearGradient
                colors={punchActive ? ['#1D5DF0', '#7C3AED'] : [C.blueDeep, C.blueLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.punchCircle}
              >
                <MaterialCommunityIcons name="fingerprint" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.punchLabel, punchActive && styles.labelOn]} maxFontSizeMultiplier={1.25}>
              Punch
            </Text>
          </TouchableOpacity>
        ) : (
          renderTab(tabs[2])
        )}

        {renderTab(tabs[3])}
        {renderTab(tabs[4])}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 6,
    shadowColor: C.ink,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // At least 58pt tall with the label, so every tab clears the 44pt touch minimum.
  item: { flex: 1, alignItems: 'center', paddingBottom: 6, minHeight: 52 },
  indicator: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 6 },
  indicatorOn: { backgroundColor: C.blue },
  label: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 3 },
  labelOn: { color: C.blue, fontWeight: '700' },

  // The circle overhangs the bar's top edge; the label stays on the row's
  // baseline so all five read as one strip.
  punchItem: { flex: 1, alignItems: 'center', paddingBottom: 6, marginTop: -PUNCH_OVERHANG },
  // A white collar so the circle reads as sitting on top of the bar rather
  // than being cut out of it.
  punchRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  punchCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchLabel: { fontSize: 12, fontWeight: '700', color: C.muted, marginTop: 5 },
});

export default BottomNavBar;
