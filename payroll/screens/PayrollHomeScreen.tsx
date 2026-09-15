/**
 * Company Home
 * The first screen inside a company: a greeting on a tinted block, and a grid
 * of quick-access tiles with the one number that matters on each. Activity has
 * its own page, reached from the row under the grid.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { BottomNavBar, BOTTOM_NAV_HEIGHT } from '../components/BottomNavBar';
import { CompanySwitcher } from '../components/CompanySwitcher';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { useDepartmentApprover } from '../hooks/useDepartmentApprover';
import leaveService from '../api/services/leaveService';
import dashboardService from '../api/services/dashboardService';
import documentService from '../api/services/documentService';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import type { IconName } from '../components/auth/PrimaryButton';
import { HeroIllustration } from '../components/illustrations/HomeIllustrations';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { dayNumber } from '../components/leave/LeaveUi';

interface PayrollHomeScreenProps {
  navigation?: any;
}

/**
 * The picture beside the greeting. Set to null to fall back to the drawn
 * version in components/illustrations.
 */
const ILLUSTRATIONS: { hero: ImageSourcePropType | null } = {
  hero: require('../../assets/illustrations/home-hero.png'),
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

type Tile = { title: string; note: string; icon: IconName; tint: string; bg: string; onPress: () => void; hidden?: boolean };

export const PayrollHomeScreen: React.FC<PayrollHomeScreenProps> = ({ navigation }) => {
  const { user } = usePayrollAuth();
  const insets = useSafeAreaInsets();
  // HR view for whoever may approve something; each approval tile only for that right.
  const access = useApproverAccess();
  const owner = access.any;
  const [unread, setUnread] = useState(0);
  const [docsToDo, setDocsToDo] = useState<number | null>(null);
  // An employee who approves leave for a department keeps the employee home, plus one row
  // for the leave waiting on them; the six tiles stay as they are.
  const { isDepartmentApprover } = useDepartmentApprover();
  const deptApprover = !owner && isDepartmentApprover;
  const [leaveWaiting, setLeaveWaiting] = useState<number | null>(null);
  const { pendingRequests, leaveHeadline, latestPayslip } = useRecentActivity(owner, 5);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      dashboardService
        .getDashboard()
        .then((d) => { if (!cancelled) setUnread(d?.unreadNotificationCount ?? 0); })
        .catch(() => {});
      // This count IS the notification for documents: there is no push for them,
      // so if the tile does not say there is something to do, nothing does.
      documentService
        .getActionNeeded()
        .then((n) => { if (!cancelled) setDocsToDo(n); })
        .catch(() => {});
      if (deptApprover) {
        leaveService
          .getPendingApprovals({ page: 1, pageSize: 1 })
          .then((r) => { if (!cancelled) setLeaveWaiting(r?.total ?? 0); })
          .catch(() => {});
      }
      return () => { cancelled = true; };
    }, [deptApprover]),
  );

  const go = (screen: string) => navigation?.navigate(screen);
  const tiles: Tile[] = owner
    ? [
        { title: 'Request Approval', note: pendingRequests === null ? '' : `${pendingRequests} Pending`, icon: 'text-box-check-outline', tint: C.blue, bg: '#E8F0FE', onPress: () => go('Requests'), hidden: !access.requests },
        { title: 'Leave Approval', note: 'Review', icon: 'calendar-check-outline', tint: '#7C3AED', bg: '#F1EAFE', onPress: () => go('Leaves'), hidden: !access.leave },
        { title: 'Claims Approval', note: 'Review', icon: 'receipt-text-outline', tint: '#D97706', bg: '#FFF4E5', onPress: () => go('ClaimsApproval'), hidden: !access.claims },
        // HR approves. It does not clock in or manage staff from the phone, so there
        // is no attendance, employee directory or punch in this view.
      ]
    : [
        { title: 'My Requests', note: pendingRequests === null ? '' : `${pendingRequests} Pending`, icon: 'text-box-outline', tint: C.blue, bg: '#E8F0FE', onPress: () => go('MyRequests') },
        // Annual leave, named, and only annual leave: "43 Days Left" was every
        // entitled type added together, most of it sick leave nobody can book a
        // holiday against. dayNumber keeps 12.500000000000002 off the tile.
        { title: 'My Leaves', note: leaveHeadline === null ? '' : `${dayNumber(leaveHeadline.days)} ${leaveHeadline.label} Days Left`, icon: 'calendar-clock-outline', tint: '#7C3AED', bg: '#F1EAFE', onPress: () => go('MyLeaves') },
        { title: 'My Payslip', note: latestPayslip ?? '', icon: 'wallet-outline', tint: '#D97706', bg: '#FFF4E5', onPress: () => go('MyPayslip') },
        { title: 'My Documents', note: docsToDo === null ? '' : docsToDo > 0 ? `${docsToDo} need you` : 'All provided', icon: 'file-document-outline', tint: '#16A34A', bg: '#E7F7EE', onPress: () => go('MyDocuments') },
        { title: 'My Claims', note: '', icon: 'receipt-text-outline', tint: '#DC2626', bg: '#FDECEC', onPress: () => go('Claims') },
        // Training sits in View All, not here: Home shows six tiles, and training is
        // something you look up now and then rather than every day.
        // The record, not the clock -- punching is the raised button in the bottom bar.
        { title: 'My Attendance', note: 'This month', icon: 'clock-check-outline', tint: '#0891B2', bg: '#E0F5F8', onPress: () => go('Attendance') },
      ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Hero: top bar + greeting on a tinted block that runs under the status
          bar; the picture sits on its right edge */}
      <View style={[styles.heroBlock, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            <Text style={styles.brandAccent}>Ai</Text>Payroll
          </Text>
          <View style={styles.switcherSlot}>
            <CompanySwitcher />
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => go('Notifications')} accessibilityLabel="Notifications">
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.ink} />
            {unread > 0 ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => go('AccountSettings')} accessibilityLabel="Settings">
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={C.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroHi} numberOfLines={1}>Hi, {user?.name || 'there'}</Text>
          <Text style={styles.heroGreeting}>{getGreeting()} 👋</Text>
          <Text style={styles.heroSub}>Let's make today productive.</Text>
        </View>
        <View style={styles.heroArt} pointerEvents="none">
          {ILLUSTRATIONS.hero ? (
            <Image source={ILLUSTRATIONS.hero} style={styles.heroImage} resizeMode="contain" />
          ) : (
            <HeroIllustration size={184} />
          )}
        </View>
      </View>

      {/* Content sheet rides up over the hero with rounded shoulders */}
      <ScrollView style={styles.sheet} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <TouchableOpacity onPress={() => go('Search')} style={styles.viewAll} hitSlop={{ top: 8, bottom: 8 }}>
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={C.blue} />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {tiles.filter((t) => !t.hidden).map((t) => (
            <TouchableOpacity key={t.title} style={[styles.tile, { backgroundColor: t.bg }]} onPress={t.onPress} activeOpacity={0.8}>
              <View style={styles.tileTop}>
                <View style={styles.tileIcon}>
                  <MaterialCommunityIcons name={t.icon} size={22} color={t.tint} />
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={t.tint} />
              </View>
              <Text style={styles.tileTitle} numberOfLines={1}>{t.title}</Text>
              <Text style={styles.tileNote} numberOfLines={1}>{t.note || ' '}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {deptApprover ? (
          <TouchableOpacity style={styles.linkRow} onPress={() => go('Leaves')} activeOpacity={0.8} accessibilityRole="button">
            <View style={[styles.linkIcon, { backgroundColor: '#F1EAFE' }]}>
              <MaterialCommunityIcons name="calendar-check-outline" size={22} color="#7C3AED" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.linkTitle}>Leave Approval</Text>
              <Text style={styles.linkNote}>
                {leaveWaiting === null ? 'Your department\'s leave' : leaveWaiting > 0 ? `${leaveWaiting} waiting for you` : 'Nothing waiting for you'}
              </Text>
            </View>
            {leaveWaiting ? <View style={styles.countPill}><Text style={styles.countPillText}>{leaveWaiting}</Text></View> : null}
            <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
          </TouchableOpacity>
        ) : null}

        {/* Activity lives on its own page */}
        <TouchableOpacity style={styles.linkRow} onPress={() => go('Activity')} activeOpacity={0.8} accessibilityRole="button">
          <View style={styles.linkIcon}>
            <MaterialCommunityIcons name="history" size={22} color={C.blue} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.linkTitle}>Recent Activity</Text>
            <Text style={styles.linkNote}>Requests, leaves and payslips</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar activeScreen="home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  heroBlock: {
    backgroundColor: '#E8F0FE',
    paddingBottom: 26,
    overflow: 'hidden',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  switcherSlot: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  brand: { fontSize: 19, fontWeight: '800', color: C.ink, letterSpacing: -0.4, flexShrink: 0 },
  brandAccent: { color: C.blue },
  dot: { position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#E8F0FE' },

  hero: { minHeight: 168, justifyContent: 'center', paddingHorizontal: 16, paddingRight: 176, paddingVertical: 6 },
  heroHi: { fontSize: 15, color: C.body },
  heroGreeting: { fontSize: 24, fontWeight: '800', color: C.ink, marginTop: 2 },
  heroSub: { fontSize: 13, color: C.muted, marginTop: 6 },
  // Pinned to the right edge of the tinted block, bottom tucked under the sheet.
  heroArt: { position: 'absolute', right: -4, bottom: 4, width: 184, height: 184, justifyContent: 'flex-end', alignItems: 'flex-end' },
  heroImage: { width: 184, height: 184 },

  sheet: { flex: 1, marginTop: -26 },
  scroll: {
    flexGrow: 1,
    backgroundColor: '#F6F8FF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: BOTTOM_NAV_HEIGHT + 16,
  },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  viewAll: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontSize: 13, fontWeight: '700', color: C.blue },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.5%', borderRadius: 18, padding: 14, minHeight: 112 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  tileTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  tileNote: { fontSize: 12, color: C.body, marginTop: 3 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  linkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  linkTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  linkNote: { fontSize: 12, color: C.body, marginTop: 2 },
  countPill: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  countPillText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});

export default PayrollHomeScreen;
