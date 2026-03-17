import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { ServiceCard } from '../components/ServiceCard';
import { LeaveApplicationCard } from '../components/LeaveApplicationCard';
import { AttendanceCard } from '../components/AttendanceCard';
import { BottomNavBar } from '../components/BottomNavBar';
import { SideMenu } from '../components/SideMenu';
import { CompanySwitcher } from '../components/CompanySwitcher';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { isOwner as checkIsOwner } from '../constants/userRoles';
import dashboardService, { DashboardData } from '../api/services/dashboardService';

interface PayrollHomeScreenProps {
  navigation?: any;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatLeaveDate(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    if (start === end) return s.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  } catch { return `${start} - ${end}`; }
}

export const PayrollHomeScreen: React.FC<PayrollHomeScreenProps> = ({ navigation }) => {
  const { user, currentRole } = usePayrollAuth();
  const isOwner = checkIsOwner(currentRole);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await dashboardService.getDashboard();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  }, []);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const attendance = dashboard?.attendanceStats ?? { present: 0, late: 0, absent: 0 };
  const unreadCount = dashboard?.unreadNotificationCount ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#4285F4" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <LinearGradient colors={['#4285F4', '#1A6BF0']} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => setMenuVisible(true)}>
              <MaterialCommunityIcons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <CompanySwitcher />
              <TouchableOpacity
                onPress={() => navigation?.navigate('Notifications')}
                style={styles.headerIconButton}
              >
                <MaterialCommunityIcons name="bell-outline" size={22} color="#FFFFFF" />
                {unreadCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.greetingTitle}>Hi {user?.name || 'User'}</Text>
            <Text style={styles.greetingSub}>{getGreeting()}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <View style={styles.contentContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Services Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isOwner ? 'Please Choose Services' : 'Category'}
              </Text>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => navigation?.navigate('Search')}
              >
                <MaterialCommunityIcons name="magnify" size={24} color="#4285F4" />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.servicesScroll}
            >
              {isOwner ? (
                <ServiceCard title="Request Approval" icon="email-outline" color="#4CAF50" onPress={() => navigation?.navigate('Requests')} />
              ) : (
                <ServiceCard title="My Requests" icon="email-outline" color="#2196F3" onPress={() => navigation?.navigate('MyRequests')} />
              )}

              {isOwner ? (
                <ServiceCard title="Leave Approval" icon="calendar-clock" color="#FF5722" onPress={() => navigation?.navigate('Leaves')} />
              ) : (
                <ServiceCard title="My Leaves" icon="calendar-clock" color="#9C27B0" onPress={() => navigation?.navigate('MyLeaves')} />
              )}

              {!isOwner && (
                <ServiceCard title="My Payslip" icon="file-document" color="#FFB300" onPress={() => navigation?.navigate('MyPayslip')} />
              )}

              {isOwner ? (
                <ServiceCard title="Attendance" icon="clock-outline" color="#2196F3" onPress={() => navigation?.navigate('Attendance')} />
              ) : (
                <ServiceCard title="Check-In" icon="fingerprint" color="#00BCD4" onPress={() => navigation?.navigate('AttendanceCheckIn')} />
              )}

              {isOwner ? (
                <ServiceCard title="Claims Approval" icon="receipt-text" color="#00897B" onPress={() => navigation?.navigate('ClaimsApproval')} />
              ) : (
                <ServiceCard title="Claims" icon="receipt" color="#00897B" onPress={() => navigation?.navigate('Claims')} />
              )}

              {isOwner && (
                <ServiceCard title="Request Types" icon="format-list-bulleted-type" color="#7B1FA2" onPress={() => navigation?.navigate('RequestTypes')} />
              )}

              {isOwner && (
                <ServiceCard title="Claim Types" icon="receipt-text-plus" color="#E65100" onPress={() => navigation?.navigate('ClaimTypes')} />
              )}

              {isOwner && (
                <ServiceCard title="Employee Map" icon="map-marker-radius" color="#00BCD4" onPress={() => navigation?.navigate('EmployeeList')} />
              )}
            </ScrollView>
          </View>

          {/* Recent Leave Application Section - Manager Only */}
          {isOwner && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Leave Application</Text>
                <TouchableOpacity onPress={() => navigation?.navigate('Leaves')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </View>

              {(dashboard?.recentLeaveApplications ?? []).length === 0 ? (
                <Text style={styles.noDataText}>No pending leave applications</Text>
              ) : (
                (dashboard?.recentLeaveApplications ?? []).slice(0, 3).map((leave) => (
                  <LeaveApplicationCard
                    key={leave.id}
                    name={leave.employeeName}
                    date={formatLeaveDate(leave.startDate, leave.endDate)}
                    type={`${leave.leaveType} Request`}
                  />
                ))
              )}
            </View>
          )}

          {/* Today's Attendance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Todays Attendance</Text>
            <View style={styles.attendanceContainer}>
              <AttendanceCard
                label="Presents"
                count={attendance.present}
                color="#4285F4"
                onPress={() => navigation?.navigate('TodaysAttendance', { filter: 'Present' })}
              />
              <AttendanceCard
                label="Late"
                count={attendance.late}
                color="#FFB300"
                onPress={() => navigation?.navigate('TodaysAttendance', { filter: 'Late' })}
              />
              <AttendanceCard
                label="Absent"
                count={attendance.absent}
                color="#FF5252"
                onPress={() => navigation?.navigate('TodaysAttendance', { filter: 'Absent' })}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      <BottomNavBar activeScreen="home" />

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4285F4' },
  safeAreaTop: { backgroundColor: '#4285F4' },
  header: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 18 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute', top: -2, right: -4, backgroundColor: '#FF5252',
    borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 4,
  },
  notifBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  userInfo: { marginBottom: 10 },
  greetingTitle: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', opacity: 0.9 },
  greetingSub: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },
  contentContainer: {
    flex: 1, backgroundColor: '#F0F4F8', borderTopLeftRadius: 30,
    borderTopRightRadius: 30, marginTop: -20,
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  searchButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#E8F0FE' },
  seeAll: { fontSize: 14, color: '#4285F4', fontWeight: '600' },
  servicesScroll: { paddingRight: 20 },
  attendanceContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  noDataText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 16 },
});

export default PayrollHomeScreen;
