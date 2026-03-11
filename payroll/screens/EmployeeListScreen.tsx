/**
 * Employee List Screen
 * Shows a list of employees for managers to select before viewing their location on map
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import attendanceService, { TeamMemberAttendance, TeamTodayResponse } from '../api/services/attendanceService';

interface EmployeeListScreenProps {
  navigation?: any;
}

const formatCheckInTime = (isoString: string | null): string => {
  if (!isoString) return '---';
  try {
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minutesStr} ${ampm}`;
  } catch {
    return '---';
  }
};

const EmployeeListScreen: React.FC<EmployeeListScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [teamData, setTeamData] = useState<TeamTodayResponse | null>(null);
  const [employees, setEmployees] = useState<TeamMemberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeamData = useCallback(async () => {
    try {
      const data = await attendanceService.getTeamToday();
      setTeamData(data);
      setEmployees(data.employees ?? []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load employee data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeamData();
  }, [fetchTeamData]);

  const handleEmployeePress = (employee: TeamMemberAttendance) => {
    if (employee.status === 'not-checked-in') {
      // Show message if employee hasn't checked in
      return;
    }

    // Navigate to map with selected employee
    navigation?.navigate('EmployeeMap', {
      selectedEmployee: {
        id: employee.employeeId,
        name: employee.employeeName,
        position: employee.position ?? '',
        department: employee.department ?? '',
        checkInTime: formatCheckInTime(employee.checkInTime),
        status: employee.status,
        latitude: employee.latitude,
        longitude: employee.longitude,
      },
      employees: employees
        .filter(e => e.status === 'checked-in')
        .map(e => ({
          id: e.employeeId,
          name: e.employeeName,
          position: e.position ?? '',
          department: e.department ?? '',
          checkInTime: formatCheckInTime(e.checkInTime),
          status: e.status,
          latitude: e.latitude,
          longitude: e.longitude,
        })),
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'checked-in' ? '#4CAF50' : '#FF9800';
  };

  const getStatusIcon = (status: string) => {
    return status === 'checked-in' ? 'check-circle' : 'clock-alert-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  const checkedInCount = teamData?.checkedIn ?? 0;
  const notCheckedInCount = teamData?.notCheckedIn ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee List</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.checkedInCard]}>
          <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
          <Text style={styles.summaryCount}>{checkedInCount}</Text>
          <Text style={styles.summaryLabel}>Checked In</Text>
        </View>
        <View style={[styles.summaryCard, styles.notCheckedInCard]}>
          <MaterialCommunityIcons name="clock-alert-outline" size={32} color="#FF9800" />
          <Text style={styles.summaryCount}>{notCheckedInCount}</Text>
          <Text style={styles.summaryLabel}>Not Checked In</Text>
        </View>
      </View>

      {/* Employee List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4285F4']} />
        }
      >
        <Text style={styles.sectionTitle}>All Employees</Text>

        {employees.map((employee) => (
          <TouchableOpacity
            key={employee.employeeId}
            style={[
              styles.employeeCard,
              employee.status === 'not-checked-in' && styles.employeeCardDisabled,
            ]}
            onPress={() => handleEmployeePress(employee)}
            activeOpacity={employee.status === 'checked-in' ? 0.7 : 1}
          >
            {/* Avatar */}
            <View style={[
              styles.avatar,
              employee.status === 'not-checked-in' && styles.avatarDisabled,
            ]}>
              <Text style={styles.avatarText}>
                {employee.employeeName.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Employee Details */}
            <View style={styles.employeeDetails}>
              <Text style={[
                styles.employeeName,
                employee.status === 'not-checked-in' && styles.textDisabled,
              ]}>
                {employee.employeeName}
              </Text>
              <Text style={[
                styles.employeePosition,
                employee.status === 'not-checked-in' && styles.textDisabled,
              ]}>
                {employee.position ?? ''}
              </Text>
              <View style={styles.departmentRow}>
                <MaterialCommunityIcons
                  name="office-building"
                  size={14}
                  color={employee.status === 'checked-in' ? '#999' : '#CCC'}
                />
                <Text style={[
                  styles.employeeDepartment,
                  employee.status === 'not-checked-in' && styles.textDisabled,
                ]}>
                  {employee.department ?? ''}
                </Text>
              </View>
            </View>

            {/* Status & Time */}
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(employee.status) + '20' },
              ]}>
                <MaterialCommunityIcons
                  name={getStatusIcon(employee.status)}
                  size={16}
                  color={getStatusColor(employee.status)}
                />
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(employee.status) },
                ]}>
                  {employee.status === 'checked-in' ? 'Checked In' : 'Not Yet'}
                </Text>
              </View>
              {employee.status === 'checked-in' && (
                <View style={styles.timeRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#666" />
                  <Text style={styles.checkInTime}>{formatCheckInTime(employee.checkInTime)}</Text>
                </View>
              )}
            </View>

            {/* Arrow Icon (only for checked-in employees) */}
            {employee.status === 'checked-in' && (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#999"
                style={styles.arrowIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  placeholder: {
    width: 40,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkedInCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notCheckedInCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  employeeCardDisabled: {
    opacity: 0.6,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarDisabled: {
    backgroundColor: '#E0E0E0',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeDepartment: {
    fontSize: 12,
    color: '#999',
  },
  textDisabled: {
    color: '#CCC',
  },
  statusContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkInTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  arrowIcon: {
    marginLeft: 4,
  },
});

export default EmployeeListScreen;
