/**
 * Today's Attendance Screen
 * Shows today's attendance with filtering by Present, Late, and Absent
 */

import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { AttendanceCard } from '../components/AttendanceCard';
import { mockTodayAttendance } from '../data/mockAttendance';
import { AttendanceStatus } from '../types/attendance.types';

export const TodaysAttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get filter from navigation params or default to 'Present'
  const initialFilter = (route.params as any)?.filter || 'Present';
  const [selectedFilter, setSelectedFilter] = useState<AttendanceStatus>(initialFilter);

  // Update filter when route params change
  useEffect(() => {
    if ((route.params as any)?.filter) {
      setSelectedFilter((route.params as any).filter);
    }
  }, [(route.params as any)?.filter]);

  // Filter attendances based on selected status
  const filteredAttendances = mockTodayAttendance.filter(
    (att) => att.status === selectedFilter
  );

  // Count for each status
  const presentCount = mockTodayAttendance.filter((a) => a.status === 'Present').length;
  const lateCount = mockTodayAttendance.filter((a) => a.status === 'Late').length;
  const absentCount = mockTodayAttendance.filter((a) => a.status === 'Absent').length;

  const handleAttendancePress = (attendance: any) => {
    navigation.navigate('AttendanceDetails' as never, { attendance } as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance</Text>
          <TouchableOpacity style={styles.calendarButton}>
            <MaterialCommunityIcons name="calendar-blank" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Todays Attendance Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Todays Attendance</Text>
        </View>

        {/* Attendance Cards (Acting as Tabs) */}
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[
              styles.card,
              selectedFilter === 'Present' && styles.cardActive,
            ]}
            onPress={() => setSelectedFilter('Present')}
            activeOpacity={0.7}
          >
            <View style={[styles.circle, { backgroundColor: '#4285F410' }]}>
              <Text style={[styles.count, { color: '#4285F4' }]}>{presentCount}</Text>
            </View>
            <Text style={styles.label}>Presents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              selectedFilter === 'Late' && styles.cardActive,
            ]}
            onPress={() => setSelectedFilter('Late')}
            activeOpacity={0.7}
          >
            <View style={[styles.circle, { backgroundColor: '#FFB30010' }]}>
              <Text style={[styles.count, { color: '#FFB300' }]}>{lateCount}</Text>
            </View>
            <Text style={styles.label}>Late</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              selectedFilter === 'Absent' && styles.cardActive,
            ]}
            onPress={() => setSelectedFilter('Absent')}
            activeOpacity={0.7}
          >
            <View style={[styles.circle, { backgroundColor: '#FF525210' }]}>
              <Text style={[styles.count, { color: '#FF5252' }]}>{absentCount}</Text>
            </View>
            <Text style={styles.label}>Absent</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance List */}
        <View style={styles.listContainer}>
          {filteredAttendances.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-off-outline" size={64} color="#CCC" />
              <Text style={styles.emptyStateText}>No {selectedFilter.toLowerCase()} attendances today</Text>
            </View>
          ) : (
            filteredAttendances.map((attendance) => (
              <TouchableOpacity
                key={attendance.id}
                style={styles.attendanceCard}
                onPress={() => handleAttendancePress(attendance)}
                activeOpacity={0.7}
              >
                {/* Avatar */}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {attendance.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                  {/* Check-in */}
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Check-in</Text>
                    <Text style={styles.checkInTime}>{attendance.checkIn}</Text>
                  </View>

                  {/* Check-out */}
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>Check-out</Text>
                    <Text style={styles.checkOutTime}>{attendance.checkOut}</Text>
                  </View>

                  {/* Location */}
                  <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="#FF9800" />
                    <Text style={styles.locationText}>{attendance.location}</Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        selectedFilter === 'Present'
                          ? '#4285F4'
                          : selectedFilter === 'Late'
                          ? '#FFB300'
                          : '#FF5252',
                    },
                  ]}
                >
                  <Text style={styles.statusText}>{selectedFilter}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeAreaTop: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  calendarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#4285F4',
    backgroundColor: '#F0F7FF',
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  count: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  listContainer: {
    marginTop: 8,
  },
  attendanceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
  },
  detailsContainer: {
    flex: 1,
  },
  timeRow: {
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  checkInTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
  checkOutTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F44336',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default TodaysAttendanceScreen;
