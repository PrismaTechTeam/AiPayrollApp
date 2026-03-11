import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, StatusBar, Text, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header, DateSelector } from '../components/attendance';
import { BottomNavBar } from '../components/BottomNavBar';
import { AttendanceDate } from '../types/attendance.types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';
import attendanceService, { TodayAttendance, AttendanceRecord } from '../api/services/attendanceService';

// Generate week dates dynamically
const generateWeekDates = (): AttendanceDate[] => {
  const today = new Date();
  const dates: AttendanceDate[] = [];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push({
      day: dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
      fullDate: d.toISOString().split('T')[0],
      isToday: i === 0,
      isSelected: i === 0,
    });
  }
  return dates;
};

interface AttendanceScreenProps {
  navigation?: any;
  route?: any;
}

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ navigation: navProp, route: routeProp }) => {
  const navigation = navProp || useNavigation();
  const route = routeProp || useRoute();
  const { currentRole } = usePayrollAuth();
  const isEmployee = currentRole === USER_ROLES.EMPLOYEE;

  const weekDates = generateWeekDates();
  const initialFilter = route.params?.filter || 'All';

  const getInitialDate = (): AttendanceDate => {
    return weekDates.find(d => d.isToday) || weekDates[0];
  };

  const [selectedDate, setSelectedDate] = useState<AttendanceDate>(getInitialDate());
  const [selectedFilter, setSelectedFilter] = useState<string>(initialFilter);
  const [todayData, setTodayData] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (route.params?.filter) {
      setSelectedFilter(route.params.filter);
    }
  }, [route.params?.filter]);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      if (selectedDate.isToday) {
        const data = await attendanceService.getToday();
        setTodayData(data);
      } else {
        // For non-today dates, try history
        setTodayData(null);
      }
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: AttendanceDate) => {
    setSelectedDate(date);
  };

  const handleAttendancePress = (attendance: any) => {
    try {
      navigation?.navigate('AttendanceDetails', { attendance });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const filters: string[] = ['All', 'Present', 'Late', 'Absent'];

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return timeStr; }
  };

  const renderTodayCard = () => {
    if (!todayData) return null;

    return (
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>Today's Attendance</Text>
        <View style={styles.todayRow}>
          <View style={styles.todayItem}>
            <MaterialCommunityIcons name="login" size={20} color="#4285F4" />
            <Text style={styles.todayLabel}>Clock In</Text>
            <Text style={styles.todayValue}>{formatTime(todayData.clockIn)}</Text>
          </View>
          <View style={styles.todayItem}>
            <MaterialCommunityIcons name="logout" size={20} color="#EA4335" />
            <Text style={styles.todayLabel}>Clock Out</Text>
            <Text style={styles.todayValue}>{formatTime(todayData.clockOut)}</Text>
          </View>
          <View style={styles.todayItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#34A853" />
            <Text style={styles.todayLabel}>Hours</Text>
            <Text style={styles.todayValue}>
              {todayData.totalWorkHours ? `${todayData.totalWorkHours.toFixed(1)}h` : '--'}
            </Text>
          </View>
        </View>

        {todayData.punches.length > 0 && (
          <View style={styles.punchList}>
            <Text style={styles.punchListTitle}>Punch Log</Text>
            {todayData.punches.map((punch) => (
              <View key={punch.id} style={styles.punchItem}>
                <View style={[styles.punchDot, { backgroundColor: punch.punchType === 'IN' ? '#34A853' : '#EA4335' }]} />
                <Text style={styles.punchTime}>{formatTime(punch.punchTime)}</Text>
                <Text style={styles.punchType}>{punch.punchType}</Text>
                <Text style={styles.punchSource}>{punch.sourceType}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Attendance"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      <DateSelector
        dates={weekDates}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterButton, selectedFilter === filter && styles.filterButtonActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </TouchableOpacity>
          ))}
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

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {selectedDate.isToday ? (
              todayData ? renderTodayCard() : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyText}>No attendance recorded today</Text>
                  <Text style={styles.emptySubtext}>Use the check-in button to clock in</Text>
                </View>
              )
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="calendar" size={48} color="#CCC" />
                <Text style={styles.emptyText}>Select today to view attendance</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {isEmployee && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation?.navigate('AttendanceCheckIn')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="fingerprint" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <BottomNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeAreaTop: { backgroundColor: '#FFFFFF' },
  filterContainer: { backgroundColor: '#F5F5F5', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  filterScrollContent: { paddingHorizontal: 20, gap: 8 },
  filterButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterButtonActive: { backgroundColor: '#4285F4' },
  mapButton: { backgroundColor: '#E0F7F4', borderWidth: 1, borderColor: '#00897B' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#666' },
  filterTextActive: { color: '#FFFFFF' },
  mapButtonText: { color: '#00897B' },
  content: { flex: 1, paddingBottom: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#CCC', marginTop: 4 },
  todayCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 16 },
  todayTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 16 },
  todayRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  todayItem: { alignItems: 'center', gap: 4 },
  todayLabel: { fontSize: 12, color: '#666' },
  todayValue: { fontSize: 16, fontWeight: '700', color: '#000' },
  punchList: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  punchListTitle: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8 },
  punchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  punchDot: { width: 8, height: 8, borderRadius: 4 },
  punchTime: { fontSize: 14, fontWeight: '600', color: '#000', width: 80 },
  punchType: { fontSize: 14, color: '#666', width: 60 },
  punchSource: { fontSize: 12, color: '#999' },
  fab: {
    position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
});

export default AttendanceScreen;
