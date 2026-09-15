/**
 * Attendance Details — one person, one day.
 *
 * Reached from Today's Attendance, so it is a manager reading a single row
 * rather than an employee reading their own month. It writes nothing; the whole
 * screen is the record that was handed to it in the route params.
 *
 * The header is inlined rather than imported: the shared `components/attendance`
 * Header was the last survivor of an abandoned look (sharp white bar, black
 * title) and this was the only screen still holding it up.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { BottomNavBar, BOTTOM_NAV_HEIGHT } from '../components/BottomNavBar';
import { Attendance, AttendanceStatus } from '../types/attendance.types';

type AttendanceDetailsRouteParams = {
  AttendanceDetails: {
    attendance: Attendance;
  };
};

type AttendanceDetailsRouteProp = RouteProp<AttendanceDetailsRouteParams, 'AttendanceDetails'>;

/** Pill colours per status. Absent is the only one that earns red. */
const STATUS_LOOK: Record<AttendanceStatus, { bg: string; fg: string }> = {
  Present: { bg: '#E7F7EE', fg: '#15803D' },
  Late: { bg: '#FFF4E5', fg: '#B45309' },
  Absent: { bg: C.dangerBg, fg: C.danger },
};

const AttendanceDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AttendanceDetailsRouteProp>();
  const { attendance } = route.params;

  const look = STATUS_LOOK[attendance.status] ?? STATUS_LOOK.Present;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* Header */}
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
            <Text style={styles.headerTitle}>Attendance</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {attendance.date}
            </Text>
          </View>
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Who */}
          <View style={styles.card}>
            <View style={styles.userSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>
                  {attendance.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {attendance.name}
                </Text>
                <Text style={styles.date}>{attendance.date}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: look.bg }]}>
                <Text style={[styles.pillText, { color: look.fg }]}>{attendance.status}</Text>
              </View>
            </View>
          </View>

          {/* When */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Times</Text>

            <View style={styles.timeRow}>
              <View style={[styles.timeIcon, styles.timeIconIn]}>
                <MaterialCommunityIcons name="login" size={20} color="#16A34A" />
              </View>
              <View style={styles.flex}>
                <Text style={styles.timeLabel}>Check-in</Text>
                <Text style={styles.timeValue}>{attendance.checkIn}</Text>
              </View>
            </View>

            <View style={styles.rule} />

            <View style={styles.timeRow}>
              <View style={[styles.timeIcon, styles.timeIconOut]}>
                <MaterialCommunityIcons name="logout" size={20} color={C.danger} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.timeLabel}>Check-out</Text>
                <Text style={styles.timeValue}>{attendance.checkOut}</Text>
              </View>
            </View>
          </View>

          {/* Where */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Location</Text>
            <View style={styles.timeRow}>
              <View style={[styles.timeIcon, styles.timeIconPlace]}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={C.blue} />
              </View>
              <Text style={styles.locationText}>{attendance.location}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeScreen="home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: {
    ...StyleSheet.absoluteFillObject,
    left: 68,
    right: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    // Clear the floating nav pill.
    paddingBottom: BOTTOM_NAV_HEIGHT + 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  userSection: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: C.blue },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '800', color: C.ink },
  date: { fontSize: 13, color: C.body, marginTop: 3 },

  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timeIcon: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  timeIconIn: { backgroundColor: '#E7F7EE' },
  timeIconOut: { backgroundColor: C.dangerBg },
  timeIconPlace: { backgroundColor: '#E6EEFF' },
  timeLabel: { fontSize: 13, color: C.body },
  timeValue: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 2, fontVariant: ['tabular-nums'] },

  rule: { height: 1, backgroundColor: C.line, marginVertical: 14 },

  locationText: { flex: 1, fontSize: 15, lineHeight: 21, color: C.ink },
});

export default AttendanceDetailsScreen;
