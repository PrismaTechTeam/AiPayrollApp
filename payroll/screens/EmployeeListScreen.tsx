/**
 * Employee List Screen
 * Shows a list of employees for managers to select before viewing their location on map
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  checkInTime: string;
  status: 'checked-in' | 'not-checked-in';
  latitude?: number;
  longitude?: number;
}

interface EmployeeListScreenProps {
  navigation?: any;
}

const EmployeeListScreen: React.FC<EmployeeListScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    // Mock employee data - In production, fetch from API
    const mockEmployees: Employee[] = [
      {
        id: '1',
        name: 'John Doe',
        position: 'Software Engineer',
        department: 'Engineering',
        checkInTime: '08:45 AM',
        status: 'checked-in',
        latitude: 3.1390 + 0.005,
        longitude: 101.6869 + 0.002,
      },
      {
        id: '2',
        name: 'Jane Smith',
        position: 'Product Manager',
        department: 'Product',
        checkInTime: '08:52 AM',
        status: 'checked-in',
        latitude: 3.1390 - 0.003,
        longitude: 101.6869 + 0.004,
      },
      {
        id: '3',
        name: 'Mike Johnson',
        position: 'UI/UX Designer',
        department: 'Design',
        checkInTime: '09:05 AM',
        status: 'checked-in',
        latitude: 3.1390 + 0.002,
        longitude: 101.6869 - 0.005,
      },
      {
        id: '4',
        name: 'Sarah Williams',
        position: 'HR Manager',
        department: 'Human Resources',
        checkInTime: '08:30 AM',
        status: 'checked-in',
        latitude: 3.1390 - 0.006,
        longitude: 101.6869 - 0.003,
      },
      {
        id: '5',
        name: 'David Brown',
        position: 'Marketing Specialist',
        department: 'Marketing',
        checkInTime: '09:15 AM',
        status: 'checked-in',
        latitude: 3.1390 + 0.007,
        longitude: 101.6869 + 0.006,
      },
      {
        id: '6',
        name: 'Emily Davis',
        position: 'Data Analyst',
        department: 'Analytics',
        checkInTime: '---',
        status: 'not-checked-in',
      },
      {
        id: '7',
        name: 'Robert Wilson',
        position: 'Sales Executive',
        department: 'Sales',
        checkInTime: '---',
        status: 'not-checked-in',
      },
    ];

    setEmployees(mockEmployees);
    setLoading(false);
  };

  const handleEmployeePress = (employee: Employee) => {
    if (employee.status === 'not-checked-in') {
      // Show message if employee hasn't checked in
      return;
    }

    // Navigate to map with selected employee
    navigation?.navigate('EmployeeMap', { 
      selectedEmployee: employee,
      employees: employees.filter(e => e.status === 'checked-in'),
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

  const checkedInCount = employees.filter(e => e.status === 'checked-in').length;
  const notCheckedInCount = employees.filter(e => e.status === 'not-checked-in').length;

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
      >
        <Text style={styles.sectionTitle}>All Employees</Text>
        
        {employees.map((employee) => (
          <TouchableOpacity
            key={employee.id}
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
                {employee.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Employee Details */}
            <View style={styles.employeeDetails}>
              <Text style={[
                styles.employeeName,
                employee.status === 'not-checked-in' && styles.textDisabled,
              ]}>
                {employee.name}
              </Text>
              <Text style={[
                styles.employeePosition,
                employee.status === 'not-checked-in' && styles.textDisabled,
              ]}>
                {employee.position}
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
                  {employee.department}
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
                  <Text style={styles.checkInTime}>{employee.checkInTime}</Text>
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
