import React, { useState } from 'react';
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
import { ServiceCard } from '../components/ServiceCard';
import { LeaveApplicationCard } from '../components/LeaveApplicationCard';
import { AttendanceCard } from '../components/AttendanceCard';
import { BottomNavBar } from '../components/BottomNavBar';
import { SideMenu } from '../components/SideMenu';
import { CompanySwitcher } from '../components/CompanySwitcher';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';

interface PayrollHomeScreenProps {
  navigation?: any;
}

export const PayrollHomeScreen: React.FC<PayrollHomeScreenProps> = ({ navigation }) => {
  const { user, currentRole } = usePayrollAuth();
  const isManager = currentRole === USER_ROLES.MANAGER;
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#4285F4" />
      
      {/* Blue Header Section with Safe Area */}
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
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.greetingTitle}>Hi {user?.name || 'Alex Smith'}</Text>
            <Text style={styles.greetingSub}>Good Morning</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Content (White Background) */}
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
              {/* Role-Based Request Cards */}
              {isManager ? (
                // Manager: Request Approval Card (Green)
                <ServiceCard
                  title="Request Approval"
                  icon="email-outline"
                  color="#4CAF50"
                  onPress={() => navigation?.navigate('Requests')}
                />
              ) : (
                // Employee: Request Application Card (Blue)
                <ServiceCard
                  title="Request Application"
                  icon="email-plus-outline"
                  color="#2196F3"
                  onPress={() => navigation?.navigate('CreateRequest')}
                />
              )}
              
              {/* Role-Based Leave Cards */}
              {isManager ? (
                // Manager: Leave Approval Card (Red)
                <ServiceCard
                  title="Leave Approval"
                  icon="calendar-clock"
                  color="#FF5722"
                  onPress={() => navigation?.navigate('Leaves')}
                />
              ) : (
                // Employee: Leave Application Card (Purple)
                <ServiceCard
                  title="Leave Application"
                  icon="calendar-plus"
                  color="#9C27B0"
                  onPress={() => navigation?.navigate('CreateLeave')}
                />
              )}
              
              {/* Role-Based Payslip Cards */}
              {isManager ? (
                // Manager: Payslip Management Card (Orange)
                <ServiceCard
                  title="Payslip Management"
                  icon="file-document-multiple"
                  color="#FFB300"
                  onPress={() => navigation?.navigate('Payslip')}
                />
              ) : (
                // Employee: My Payslip Card (Orange)
                <ServiceCard
                  title="My Payslip"
                  icon="file-document"
                  color="#FFB300"
                  onPress={() => navigation?.navigate('MyPayslip')}
                />
              )}
              {/* Role-Based Attendance Cards */}
              {isManager ? (
                // Manager: Attendance Management Card
                <ServiceCard
                  title="Attendance"
                  icon="clock-outline"
                  color="#2196F3"
                  onPress={() => navigation?.navigate('Attendance')}
                />
              ) : (
                // Employee: Check-In Card
                <ServiceCard
                  title="Check-In"
                  icon="fingerprint"
                  color="#00BCD4"
                  onPress={() => navigation?.navigate('AttendanceCheckIn')}
                />
              )}

              {/* Role-Based Claims Cards */}
              {isManager ? (
                // Manager: Claims Approval Card (Teal)
                <ServiceCard
                  title="Claims Approval"
                  icon="receipt-text"
                  color="#00897B"
                  onPress={() => navigation?.navigate('ClaimsApproval')}
                />
              ) : (
                // Employee: Claims Card (Teal)
                <ServiceCard
                  title="Claims"
                  icon="receipt"
                  color="#00897B"
                  onPress={() => navigation?.navigate('Claims')}
                />
              )}

              {/* Employee Map Card - Manager Only */}
              {isManager && (
                <ServiceCard
                  title="Employee Map"
                  icon="map-marker-radius"
                  color="#00BCD4"
                  onPress={() => navigation?.navigate('EmployeeList')}
                />
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
              
              <LeaveApplicationCard
                name="Alexa Smith"
                date="27 Aug - 28 Aug, 2021"
                type="Sick Leave Request"
              />
              <LeaveApplicationCard
                name="Jack Liam"
                date="25 Aug - 26 Aug, 2021"
                type="Annual Leave Request"
              />
            </View>
          )}

          {/* Today's Attendance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Todays Attendance</Text>
            <View style={styles.attendanceContainer}>
              <AttendanceCard
                label="Presents"
                count={3}
                color="#4285F4"
                onPress={() => navigation?.navigate('TodaysAttendance', { filter: 'Present' })}
              />
              <AttendanceCard
                label="Late"
                count={2}
                color="#FFB300"
                onPress={() => navigation?.navigate('TodaysAttendance', { filter: 'Late' })}
              />
              <AttendanceCard
                label="Absent"
                count={2}
                color="#FF5252"
                onPress={() => navigation?.navigate('TodaysAttendance', { filter: 'Absent' })}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeScreen="home" />

      {/* Side Menu */}
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4285F4', // Match header color
  },
  safeAreaTop: {
    backgroundColor: '#4285F4',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
  },
  userInfo: {
    marginBottom: 10,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  greetingSub: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray background to match image
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20, // Overlap slightly with blue header
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for nav bar
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  seeAll: {
    fontSize: 14,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  servicesScroll: {
    paddingRight: 20,
  },
  attendanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default PayrollHomeScreen;

