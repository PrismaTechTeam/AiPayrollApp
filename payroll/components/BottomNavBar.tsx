/**
 * Bottom Navigation Bar
 * A floating white pill with four labelled tabs and a raised Punch button in
 * the middle.
 *
 * Punch sits above the bar rather than in it because clocking in is the one
 * thing an employee does every single day, often in a hurry at a gate — it
 * should be the largest target on the screen and reachable without looking.
 * HR and other managers get the four tabs only: they approve, they do not punch.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { AUTH_COLORS as C } from './auth/AuthBackdrop';
import type { IconName } from './auth/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';

export type NavTab = 'home' | 'leave' | 'requests' | 'profile' | 'punch';

interface BottomNavBarProps {
  activeScreen?: NavTab;
}

/** Height other screens should pad their content by so the bar never covers it. */
export const BOTTOM_NAV_HEIGHT = 84;

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  // The HR view is for whoever may approve something (useApproverAccess), not a role name.
  const access = useApproverAccess();
  const owner = access.any;

  const tabs: { key: NavTab; label: string; icon: IconName; activeIcon: IconName; screen: keyof RootStackParamList }[] = [
    { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home', screen: 'PayrollHome' },
    { key: 'requests', label: 'Requests', icon: 'text-box-outline', activeIcon: 'text-box', screen: access.requests ? 'Requests' : 'MyRequests' },
    // Leave, not Payslip: an employee opens leave many times a month and a
    // payslip once. Payslip keeps its tile on the home grid.
    { key: 'leave', label: 'Leave', icon: 'calendar-clock-outline', activeIcon: 'calendar-clock', screen: 'MyLeaves' },
    { key: 'profile', label: 'Profile', icon: 'account-outline', activeIcon: 'account', screen: 'AccountSettings' },
  ];

  const punchActive = activeScreen === 'punch';

  const renderTab = (t: (typeof tabs)[number]) => {
    const active = activeScreen === t.key;
    return (
      <TouchableOpacity
        key={t.key}
        style={styles.item}
        onPress={() => navigation.navigate(t.screen as never)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <View style={[styles.indicator, active && styles.indicatorOn]} />
        <MaterialCommunityIcons name={active ? t.activeIcon : t.icon} size={24} color={active ? C.blue : C.muted} />
        <Text style={[styles.label, active && styles.labelOn]}>{t.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        {/* Punch lives in the row so its label lines up with the others; only
            the circle is lifted out of the bar. Employees only: HR approves,
            it does not clock in from the phone. */}
        {!owner && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AttendanceCheckIn')}
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
            <Text style={[styles.punchLabel, punchActive && styles.labelOn]}>Punch</Text>
          </TouchableOpacity>
        )}

        {renderTab(tabs[2])}
        {renderTab(tabs[3])}
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
  item: { flex: 1, alignItems: 'center', paddingBottom: 6 },
  indicator: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 6 },
  indicatorOn: { backgroundColor: C.blue },
  label: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 3 },
  labelOn: { color: C.blue, fontWeight: '700' },

  // The circle overhangs the bar's top edge; the label stays on the row's
  // baseline so all five read as one strip.
  punchItem: { flex: 1, alignItems: 'center', paddingBottom: 6, marginTop: -26 },
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
