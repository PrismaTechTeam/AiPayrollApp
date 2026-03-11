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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { ServiceCard } from '../components/ServiceCard';
import { LeaveApplicationCard } from '../components/LeaveApplicationCard';
import { AttendanceCard } from '../components/AttendanceCard';
import { BottomNavBar } from '../components/BottomNavBar';
import { SideMenu } from '../components/SideMenu';
import { CompanySwitcher } from '../components/CompanySwitcher';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';
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
  const isManager = currentRole === USER_ROLES.MANAGER;
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
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <MaterialCommunityIcons name="menu" size={30} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <CompanySwitcher />
              <TouchableOpacity
                onPress={() => navigation?.navigate('Notifications')}
                style={styles.notificationButton}
              >
                <MaterialCommunityIcons name="bell-outline" size={28} color="#FFFFFF" />
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
        </View>
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
                {isManager ? 'Please Choose Services' : 'Category'}
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
              {isManager ? (
                <ServiceCard title="Request Approval" icon="email-outline" color="#4CAF50" onPress={() => navigation?.navigate('Requests')} />
              ) : (
                <ServiceCard title="Request Application" icon="email-plus-outline" color="#2196F3" onPress={() => navigation?.navigate('CreateRequest')} />
              )}

              {isManager ? (
                <ServiceCard title="Leave Approval" icon="calendar-clock" color="#FF5722" onPress={() => navigation?.navigate('Leaves')} />
              ) : (
                <ServiceCard title="Leave Application" icon="calendar-plus" color="#9C27B0" onPress={() => navigation?.navigate('CreateLeave')} />
              )}

              {isManager ? (
                <ServiceCard title="Payslip Management" icon="file-document-multiple" color="#FFB300" onPress={() => navigation?.navigate('Payslip')} />
              ) : (
                <ServiceCard title="My Payslip" icon="file-document" color="#FFB300" onPress={() => navigation?.navigate('MyPayslip')} />
              )}

              {isManager ? (
                <ServiceCard title="Attendance" icon="clock-outline" color="#2196F3" onPress={() => navigation?.navigate('Attendance')} />
              ) : (
                <ServiceCard title="Check-In" icon="fingerprint" color="#00BCD4" onPress={() => navigation?.navigate('AttendanceCheckIn')} />
              )}

              {isManager ? (
                <ServiceCard title="Claims Approval" icon="receipt-text" color="#00897B" onPress={() => navigation?.navigate('ClaimsApproval')} />
              ) : (
                <ServiceCard title="Claims" icon="receipt" color="#00897B" onPress={() => navigation?.navigate('Claims')} />
              )}

              {isManager && (
                <ServiceCard title="Employee Map" icon="map-marker-radius" color="#00BCD4" onPress={() => navigation?.navigate('EmployeeList')} />
              )}
            </ScrollView>
          </View>

          {/* Recent Leave Application Section - Manager Only */}
          {isManager && (
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
  header: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notificationButton: { padding: 4 },
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
    flex: 1, backgroundColor: '#F5F5F5', borderTopLeftRadius: 30,
    borderTopRightRadius: 30, marginTop: -20,
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  searchButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#F5F5F5' },
  seeAll: { fontSize: 14, color: '#9E9E9E', fontWeight: '600' },
  servicesScroll: { paddingRight: 20 },
  attendanceContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  noDataText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 16 },
});

export default PayrollHomeScreen;
