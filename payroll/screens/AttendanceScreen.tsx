import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header, DateSelector, AttendanceList } from '../components/attendance';
import { BottomNavBar } from '../components/BottomNavBar';
import { weekDates, getAttendanceByDate } from '../data/mockAttendance';
import { AttendanceDate, AttendanceStatus } from '../types/attendance.types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';

interface AttendanceScreenProps {
  navigation?: any;
  route?: any;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ navigation: navProp, route: routeProp }) => {
  const navigation = navProp || useNavigation();
  const route = routeProp || useRoute();
  const { currentRole } = usePayrollAuth();
  const isEmployee = currentRole === USER_ROLES.EMPLOYEE;
  
  // Get filter from navigation params
  const initialFilter = route.params?.filter || 'All';
  
  // Initialize selected date safely
  const getInitialDate = (): AttendanceDate => {
    if (!weekDates || weekDates.length === 0) {
      // Fallback date if weekDates is not available
      const today = new Date();
      return {
        day: 'Mo',
        date: today.getDate(),
        month: 'Jan',
        fullDate: today.toISOString().split('T')[0],
        isToday: true,
        isSelected: true,
      };
    }
    return weekDates.find(d => d.isToday) || weekDates[0];
  };
  
  const [selectedDate, setSelectedDate] = useState<AttendanceDate>(getInitialDate());
  const [selectedFilter, setSelectedFilter] = useState<AttendanceStatus | 'All'>(initialFilter);

  // Update filter when route params change
  useEffect(() => {
    if (route.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route.params?.filter]);

  // Get attendance records for selected date
  const allAttendances = getAttendanceByDate(selectedDate.fullDate);
  
  // Filter attendances based on selected filter
  const attendances = selectedFilter === 'All'
    ? allAttendances
    : allAttendances.filter(att => att.status === selectedFilter);

  const handleDateSelect = (date: AttendanceDate) => {
    setSelectedDate(date);
  };

  const handleAttendancePress = (attendance: any) => {
    console.log('📱 [AttendanceScreen] handleAttendancePress called for attendance:', attendance.id);
    try {
      navigation?.navigate('AttendanceDetails', { attendance });
      console.log('✅ [AttendanceScreen] Navigation called successfully');
    } catch (error) {
      console.error('❌ [AttendanceScreen] Navigation error:', error);
    }
  };

  const filters: Array<AttendanceStatus | 'All'> = ['All', 'Present', 'Late', 'Absent'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with Safe Area */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Attandance"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>
      
      {/* Date Selector */}
      <DateSelector
        dates={weekDates}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />
      
      {/* Filter Tabs and Map Button */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Employee Map Button - Manager Only */}
          {!isEmployee && (
            <TouchableOpacity
              style={[styles.filterButton, styles.mapButton]}
              onPress={() => navigation?.navigate('EmployeeList')}
            >
              <MaterialCommunityIcons name="map-marker-radius" size={16} color="#00897B" />
              <Text style={[styles.filterText, styles.mapButtonText]}>Employee Map</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
      
      {/* Content Area */}
      <View style={styles.content}>
        {/* Attendance List */}
        <View style={styles.listContainer}>
          <AttendanceList
            attendances={attendances}
            onPress={handleAttendancePress}
          />
        </View>
      </View>

      {/* Floating Action Button - Employee Only */}
      {isEmployee && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation?.navigate('AttendanceCheckIn')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="fingerprint" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNavBar />
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
  filterContainer: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4285F4',
  },
  mapButton: {
    backgroundColor: '#E0F7F4',
    borderWidth: 1,
    borderColor: '#00897B',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  mapButtonText: {
    color: '#00897B',
  },
  content: {
    flex: 1,
    paddingBottom: 80, // Space for bottom nav bar
  },
  listContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 100, // Above bottom nav bar
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default AttendanceScreen;
