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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import attendanceService, { TeamMemberAttendance, TeamTodayResponse } from '../api/services/attendanceService';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { useDialog } from '../components/ui/AppDialog';
import { serverMessage } from '../lib/serverMessage';

/** Green for someone who is in, amber for someone who is not. Nothing else earns colour. */
const IN_GREEN = '#16A34A';
const OUT_AMBER = '#D97706';

/**
 * Whether this row can be put on a map at all.
 *
 * Being clocked in does not mean we know where from: a fingerprint terminal records no
 * coordinates, and neither did the phone before punch locations existed. Those rows arrive
 * with latitude and longitude null, and handing a null to a map Marker draws nothing at
 * best.
 */
const hasFix = (
  e: TeamMemberAttendance,
): e is TeamMemberAttendance & { latitude: number; longitude: number } =>
  typeof e.latitude === 'number' && typeof e.longitude === 'number';

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

/**
 * Two letters off the name, so a row without a photo still has something to
 * recognise at a glance. One word gives one letter rather than a repeated one.
 */
const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const EmployeeListScreen: React.FC<EmployeeListScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const dialog = useDialog();
  const [teamData, setTeamData] = useState<TeamTodayResponse | null>(null);
  const [employees, setEmployees] = useState<TeamMemberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeamData = useCallback(async () => {
    try {
      const data = await attendanceService.getTeamToday();
      setTeamData(data);
      setEmployees(data.employees ?? []);
    } catch (error: unknown) {
      await dialog.notify({
        title: 'Could not load your team',
        message: serverMessage(error, 'Please try again.'),
        tone: 'danger',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dialog]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeamData();
  }, [fetchTeamData]);

  const handleEmployeePress = (employee: TeamMemberAttendance) => {
    // Both of these used to be a `return` with a comment promising a message. A row that
    // does nothing when tapped reads as a broken app, so each one now says why.
    if (employee.status === 'not-checked-in') {
      void dialog.notify({
        title: `${employee.employeeName} has not clocked in`,
        message: 'There is nothing to show on the map until they do.',
        tone: 'info',
      });
      return;
    }

    if (!hasFix(employee)) {
      void dialog.notify({
        title: 'No map location for this clock-in',
        message: `${employee.employeeName} clocked in at ${formatCheckInTime(employee.checkInTime)}, but the punch carried no position — an office terminal records the time, not the place.`,
        tone: 'info',
      });
      return;
    }

    // Only rows with a real fix are handed to the map: it takes plain numbers, and a null
    // coordinate puts a marker nowhere.
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
        .filter(hasFix)
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
    return status === 'checked-in' ? IN_GREEN : OUT_AMBER;
  };

  const getStatusIcon = (status: string) => {
    return status === 'checked-in' ? 'check-circle-outline' : 'clock-alert-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <AuthBackdrop scriptLines={[]} />
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={styles.loadingText}>Loading employees…</Text>
      </View>
    );
  }

  const checkedInCount = teamData?.checkedIn ?? 0;
  const notCheckedInCount = teamData?.notCheckedIn ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      {/* Header */}
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Employees</Text>
            <Text style={styles.headerSubtitle}>Who is on the clock today</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconIn]}>
              <MaterialCommunityIcons name="check-circle-outline" size={22} color={IN_GREEN} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.summaryCount}>{checkedInCount}</Text>
              <Text style={styles.summaryLabel}>Checked in</Text>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.summaryIconOut]}>
              <MaterialCommunityIcons name="clock-alert-outline" size={22} color={OUT_AMBER} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.summaryCount}>{notCheckedInCount}</Text>
              <Text style={styles.summaryLabel}>Not yet</Text>
            </View>
          </View>
        </View>

        {/* Employee List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.blue]}
              tintColor={C.blue}
            />
          }
        >
          <Text style={styles.sectionTitle}>All employees</Text>

          {employees.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={40} color={C.muted} />
              <Text style={styles.emptyTitle}>Nobody to show</Text>
              <Text style={styles.emptyBody}>
                No one is listed under you today. Pull down to check again.
              </Text>
            </View>
          ) : null}

          {employees.map((employee) => {
            const inToday = employee.status === 'checked-in';
            const tone = getStatusColor(employee.status);
            // Position and department are both optional on the wire. Rather than
            // leaving a blank line where one is missing, the row falls back to the
            // other and only says "No role on file" when both are empty.
            const role = employee.position?.trim() || '';
            const dept = employee.department?.trim() || '';

            return (
              <TouchableOpacity
                key={employee.employeeId}
                style={[styles.employeeCard, !inToday && styles.employeeCardDim]}
                onPress={() => handleEmployeePress(employee)}
                activeOpacity={inToday ? 0.7 : 1}
                accessibilityRole="button"
                accessibilityLabel={`${employee.employeeName}, ${inToday ? 'checked in' : 'not checked in'}`}
              >
                {/* Avatar */}
                <View style={[styles.avatar, !inToday && styles.avatarDim]}>
                  <Text style={[styles.avatarText, !inToday && styles.avatarTextDim]}>
                    {initialsOf(employee.employeeName)}
                  </Text>
                </View>

                {/* Employee Details */}
                <View style={styles.employeeDetails}>
                  <Text style={styles.employeeName} numberOfLines={1}>
                    {employee.employeeName}
                  </Text>
                  <Text style={styles.employeeRole} numberOfLines={1}>
                    {role || dept || 'No role on file'}
                  </Text>
                  {role && dept ? (
                    <View style={styles.departmentRow}>
                      <MaterialCommunityIcons name="office-building-outline" size={13} color={C.muted} />
                      <Text style={styles.employeeDepartment} numberOfLines={1}>
                        {dept}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: `${tone}1A` }]}>
                      <MaterialCommunityIcons name={getStatusIcon(employee.status)} size={13} color={tone} />
                      <Text style={[styles.statusText, { color: tone }]}>
                        {inToday ? 'Checked in' : 'Not yet'}
                      </Text>
                    </View>
                    {inToday ? (
                      <View style={styles.timeRow}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color={C.muted} />
                        <Text style={styles.checkInTime}>{formatCheckInTime(employee.checkInTime)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Arrow Icon (only for checked-in employees) */}
                {inToday ? (
                  <MaterialCommunityIcons name="chevron-right" size={24} color={C.muted} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8FF',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: C.body,
  },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: {
    ...StyleSheet.absoluteFillObject,
    left: 68,
    right: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  summaryIconIn: { backgroundColor: '#E7F7EE' },
  summaryIconOut: { backgroundColor: '#FFF4E5' },
  summaryCount: { fontSize: 22, fontWeight: '800', color: C.ink },
  summaryLabel: { fontSize: 12, color: C.body, marginTop: 1 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginBottom: 10,
  },

  empty: { alignItems: 'center', paddingTop: 48, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 6 },
  emptyBody: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center', paddingHorizontal: 24 },

  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  // Dimmed rather than greyed out: the row still opens a message explaining why
  // there is nothing to see, so it must not read as disabled.
  employeeCardDim: { shadowOpacity: 0.04 },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDim: { backgroundColor: '#EEF2F7' },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.blue, letterSpacing: 0.5 },
  avatarTextDim: { color: C.muted },

  employeeDetails: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '700', color: C.ink },
  employeeRole: { fontSize: 13, color: C.body, marginTop: 2 },
  departmentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  employeeDepartment: { flex: 1, fontSize: 12, color: C.muted },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkInTime: { fontSize: 12, color: C.body, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

export default EmployeeListScreen;
