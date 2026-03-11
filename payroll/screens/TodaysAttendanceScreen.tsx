/**
 * Today's Attendance Screen
 * Shows today's team attendance with filtering by Present, Late, and Absent
 * Uses real API via attendanceService.getTeamToday()
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import attendanceService, { TeamMemberAttendance, TeamTodayResponse } from '../api/services/attendanceService';

type FilterStatus = 'Present' | 'Late' | 'Absent';

/**
 * Format an ISO date string to a readable time like "08:45 AM"
 */
const formatTime = (isoString: string | null): string => {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
};

/**
 * Get location display text from coordinates
 */
const getLocationText = (latitude: number | null, longitude: number | null): string => {
  if (latitude != null && longitude != null) {
    return 'Mobile Check-in';
  }
  return 'No location';
};

export const TodaysAttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get filter from navigation params or default to 'Present'
  const initialFilter = (route.params as any)?.filter || 'Present';
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>(initialFilter);
  const [teamData, setTeamData] = useState<TeamTodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Update filter when route params change
  useEffect(() => {
    if ((route.params as any)?.filter) {
      setSelectedFilter((route.params as any).filter);
    }
  }, [(route.params as any)?.filter]);

  const fetchTeamAttendance = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await attendanceService.getTeamToday();
      setTeamData(data);
    } catch (error) {
      console.error('Failed to fetch team attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamAttendance();
  }, [fetchTeamAttendance]);

  const onRefresh = useCallback(() => {
    fetchTeamAttendance(true);
  }, [fetchTeamAttendance]);

  // Derive employees list
  const employees = teamData?.employees ?? [];

  // Filter employees based on selected status
  const filteredEmployees = employees.filter((emp) => {
    if (selectedFilter === 'Present') return emp.status === 'checked-in';
    if (selectedFilter === 'Absent') return emp.status === 'not-checked-in';
    // 'Late' — backend doesn't differentiate, so no matches
    return false;
  });

  // Counts
  const presentCount = teamData?.checkedIn ?? 0;
  const lateCount = 0; // Backend doesn't track late separately for team view
  const absentCount = teamData?.notCheckedIn ?? 0;

  const handleAttendancePress = (employee: TeamMemberAttendance) => {
    const attendance = {
      id: employee.employeeId,
      name: employee.employeeName,
      position: employee.position,
      department: employee.department,
      status: employee.status === 'checked-in' ? 'Present' : 'Absent',
      checkIn: formatTime(employee.checkInTime),
      checkOut: '--:--',
      location: getLocationText(employee.latitude, employee.longitude),
      latitude: employee.latitude,
      longitude: employee.longitude,
    };
    navigation.navigate('AttendanceDetails' as never, { attendance } as never);
  };

  const getFilterLabel = (filter: FilterStatus): string => {
    if (filter === 'Present') return 'present';
    if (filter === 'Late') return 'late';
    return 'absent';
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4285F4']}
              tintColor="#4285F4"
            />
          }
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
            {filteredEmployees.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-off-outline" size={64} color="#CCC" />
                <Text style={styles.emptyStateText}>No {getFilterLabel(selectedFilter)} attendances today</Text>
              </View>
            ) : (
              filteredEmployees.map((employee) => (
                <TouchableOpacity
                  key={employee.employeeId}
                  style={styles.attendanceCard}
                  onPress={() => handleAttendancePress(employee)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {employee.employeeName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Details */}
                  <View style={styles.detailsContainer}>
                    {/* Employee Name */}
                    <Text style={styles.employeeName}>{employee.employeeName}</Text>

                    {/* Check-in */}
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>Check-in</Text>
                      <Text style={styles.checkInTime}>{formatTime(employee.checkInTime)}</Text>
                    </View>

                    {/* Location */}
                    <View style={styles.locationRow}>
                      <MaterialCommunityIcons name="map-marker" size={16} color="#FF9800" />
                      <Text style={styles.locationText}>
                        {getLocationText(employee.latitude, employee.longitude)}
                      </Text>
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
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
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
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
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
