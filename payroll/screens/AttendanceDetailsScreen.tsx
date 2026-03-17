/**
 * Attendance Details Screen
 * Displays detailed information about a specific attendance record
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Header } from '../components/attendance';
import { BottomNavBar } from '../components/BottomNavBar';
import { Attendance } from '../types/attendance.types';
import { useTheme } from '../context/ThemeContext';

type AttendanceDetailsRouteParams = {
  AttendanceDetails: {
    attendance: Attendance;
  };
};

type AttendanceDetailsRouteProp = RouteProp<AttendanceDetailsRouteParams, 'AttendanceDetails'>;

const AttendanceDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<AttendanceDetailsRouteProp>();
  const { attendance } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header with Safe Area */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Attandance"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      {/* Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Attendance Card */}
        <View style={styles.attendanceCard}>
          {/* Avatar and Name */}
          <View style={styles.userSection}>
            <View style={styles.avatarContainer}>
              {attendance.avatarUrl ? (
                <View style={[styles.avatar, styles.avatarImage]} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>
                    {attendance.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{attendance.name}</Text>
              <Text style={styles.date}>{attendance.date}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Check-in Section */}
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Check-in</Text>
            <Text style={styles.checkInTime}>{attendance.checkIn}</Text>
          </View>

          {/* Check-out Section */}
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Check-out</Text>
            <Text style={styles.checkOutTime}>{attendance.checkOut}</Text>
          </View>

          {/* Location Section */}
          <View style={styles.locationSection}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#FF9800" />
            <Text style={styles.locationText}>{attendance.location}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeAreaTop: {
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for bottom nav bar
  },
  attendanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    backgroundColor: colors.primary,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  timeSection: {
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  checkInTime: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary, // Blue color for check-in
  },
  checkOutTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F44336', // Red color for check-out
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  locationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
});

export default AttendanceDetailsScreen;
