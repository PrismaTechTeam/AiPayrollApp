/**
 * Team Today (Employee List)
 * Who is in, who has left and who has not arrived yet, across the company, for
 * HR's morning check. A row with a clock-in position opens it on the map.
 *
 * The server returns every active employee in the company (not only the
 * caller's reports), so the list is virtualised, searchable and filterable by
 * state, and each row is one compact line: a company of 300 used to render 300
 * tall cards at once. Rows are sorted by name, because the server sends them in
 * no order and they used to jump about on every refresh.
 *
 * Today's server only knows "clocked in" and "not yet"; the reworked one also
 * says who has clocked out since. Both read correctly here: the Out chip simply
 * does not appear until someone has left.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import attendanceService, { TeamMemberAttendance } from '../api/services/attendanceService';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { LeaveState } from '../components/leave/LeaveUi';
import { ChipRow, clockText, fullDateText, personInitials } from '../components/attendance/PunchRequestUi';
import { parseDate } from '../components/requests/RequestUi';
import { useDialog } from '../components/ui/AppDialog';
import { serverMessage, statusOfError } from '../lib/serverMessage';
import { mapsAvailable } from '../lib/mapsAvailable';

/** Read once: whether this build carries what a map needs does not change while it runs. */
const CAN_MAP = mapsAvailable();

/** Green for in, amber for not yet, grey for gone home or on leave. Nothing else earns colour. */
const IN_GREEN = '#16A34A';
const NOT_YET_AMBER = '#D97706';
const GREY_BG = '#EEF2F7';

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
  e.status !== 'not-checked-in' && typeof e.latitude === 'number' && typeof e.longitude === 'number';

/** "9:01 AM" off a server timestamp, through the same parser and words as the punch screens. */
const timeOf = (iso: string | null | undefined): string => {
  const d = parseDate(iso);
  return d ? clockText(d.getHours(), d.getMinutes()) : '—';
};

/** The server's "2026-10-08" as that calendar day here, never shifted a day by a zone. */
const dayOf = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** What the map screen is handed: plain numbers only, never a null coordinate. */
const toMapPin = (e: TeamMemberAttendance & { latitude: number; longitude: number }) => ({
  id: e.employeeId,
  name: e.employeeName,
  position: e.position ?? '',
  department: e.department ?? '',
  checkInTime: timeOf(e.checkInTime),
  // Only for someone who has left, so the map card can say so. Undefined otherwise.
  checkOutTime: e.status === 'checked-out' && e.lastPunchTime ? timeOf(e.lastPunchTime) : undefined,
  latitude: e.latitude,
  longitude: e.longitude,
});

type Filter = 'all' | 'not-yet' | 'in' | 'out' | 'leave';

/** Which chip a row belongs to. Someone on leave is not "not yet": they are not coming. */
const filterOf = (e: TeamMemberAttendance): Exclude<Filter, 'all'> =>
  e.status === 'checked-in' ? 'in' : e.status === 'checked-out' ? 'out' : e.onLeave ? 'leave' : 'not-yet';

/** The badge on the right of a row. */
const badgeOf = (e: TeamMemberAttendance): { text: string; fg: string; bg: string } => {
  switch (filterOf(e)) {
    case 'in':
      return { text: `In ${timeOf(e.checkInTime)}`, fg: IN_GREEN, bg: `${IN_GREEN}1A` };
    case 'out':
      return { text: e.lastPunchTime ? `Out ${timeOf(e.lastPunchTime)}` : 'Out', fg: C.body, bg: GREY_BG };
    case 'leave':
      return { text: 'On leave', fg: C.body, bg: GREY_BG };
    default:
      return { text: 'Not yet', fg: NOT_YET_AMBER, bg: `${NOT_YET_AMBER}1A` };
  }
};

const EMPTY_TEXT: Record<Filter, string> = {
  all: 'No active employees in this company',
  'not-yet': 'Everyone has clocked in',
  in: 'No one is clocked in right now',
  out: 'No one has clocked out yet',
  leave: 'No one is on leave today',
};

/** First load, the answer, or the request failed. Kept apart so a failure never reads as "nobody". */
type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; date: string; employees: TeamMemberAttendance[]; fetchedAt: Date }
  | { kind: 'failed'; message: string; denied: boolean };

const EmployeeListScreen: React.FC = () => {
  // A stack screen: the navigator always provides this, so no prop fallback
  // (calling the hook only sometimes broke the rules of hooks).
  const navigation = useNavigation<any>();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /**
   * A failure replaces only the spinner or an earlier failure; a list already on
   * screen stays. A 403 (no attendance right, or today's server refusing anyone not
   * linked to an employee) is kept apart, because retrying it can never work.
   */
  const fetchTeamData = useCallback(async (): Promise<string | null> => {
    try {
      const data = await attendanceService.getTeamToday();
      const employees = [...data.employees].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      if (alive.current) setState({ kind: 'ready', date: data.date, employees, fetchedAt: new Date() });
      return null;
    } catch (error: unknown) {
      const denied = statusOfError(error) === 403;
      const message = serverMessage(error, denied ? 'Your role cannot see team attendance.' : 'Check your connection and try again.');
      if (alive.current) setState((prev) => (prev.kind === 'ready' && !denied ? prev : { kind: 'failed', message, denied }));
      return message;
    }
  }, []);

  useEffect(() => {
    void fetchTeamData();
  }, [fetchTeamData]);

  const onRefresh = async () => {
    const hadList = state.kind === 'ready';
    setRefreshing(true);
    const failure = await fetchTeamData();
    if (!alive.current) return;
    setRefreshing(false);
    // The old list stayed on screen; say why it did not change.
    if (failure && hadList) void dialog.notify({ title: 'Could not refresh', message: failure, tone: 'danger' });
  };

  const retry = () => {
    setState({ kind: 'loading' });
    void fetchTeamData();
  };

  const employees = useMemo(() => (state.kind === 'ready' ? state.employees : []), [state]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: employees.length, 'not-yet': 0, in: 0, out: 0, leave: 0 };
    employees.forEach((e) => { c[filterOf(e)] += 1; });
    return c;
  }, [employees]);

  const pins = useMemo(() => employees.filter(hasFix).map(toMapPin), [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter(
      (e) =>
        (filter === 'all' || filterOf(e) === filter) &&
        (!q || [e.employeeName, e.employeeCode, e.position, e.department].some((v) => (v ?? '').toLowerCase().includes(q))),
    );
  }, [employees, query, filter]);

  // Out and On leave only appear once someone is in them; today's server never fills either.
  const chips = useMemo(
    () =>
      [
        { key: 'all' as Filter, label: 'All', count: counts.all },
        { key: 'not-yet' as Filter, label: 'Not yet', count: counts['not-yet'] },
        { key: 'in' as Filter, label: 'In', count: counts.in },
        ...(counts.out > 0 ? [{ key: 'out' as Filter, label: 'Out', count: counts.out }] : []),
        ...(counts.leave > 0 ? [{ key: 'leave' as Filter, label: 'On leave', count: counts.leave }] : []),
      ],
    [counts],
  );

  // A chip that disappears (say Out, after a refresh) must not leave the list filtered by it.
  useEffect(() => {
    if (!chips.some((c) => c.key === filter)) setFilter('all');
  }, [chips, filter]);

  const openMap = (employee?: TeamMemberAttendance & { latitude: number; longitude: number }) => {
    navigation.navigate('EmployeeMap', {
      selectedEmployee: employee ? toMapPin(employee) : undefined,
      employees: pins,
    });
  };

  const renderRow = ({ item: employee }: { item: TeamMemberAttendance }) => {
    const badge = badgeOf(employee);
    const notYet = employee.status === 'not-checked-in';
    // Position and department are both optional on the wire; one line shows
    // whichever exist, and only says "No role on file" when both are empty.
    const role = employee.position?.trim() || '';
    const dept = employee.department?.trim() || '';
    const roleLine = [role, dept].filter(Boolean).join(' · ') || 'No role on file';
    const name = employee.employeeName || 'Unnamed employee';

    const content = (
      <>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, notYet && styles.avatarTextDim]}>{personInitials(employee.employeeName)}</Text>
        </View>
        <View style={styles.details}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {employee.employeeCode ? <Text style={styles.code} numberOfLines={1}>{employee.employeeCode}</Text> : null}
          </View>
          <Text style={styles.role} numberOfLines={1}>{roleLine}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.fg }]} numberOfLines={1}>{badge.text}</Text>
        </View>
      </>
    );

    // Only a clock-in with a position can be opened. Every other row is plain text:
    // it used to look tappable and answer each tap with a dialog explaining why not.
    // On a build that cannot draw a map no row opens one.
    if (!hasFix(employee) || !CAN_MAP) {
      return (
        <View
          style={styles.row}
          accessible
          accessibilityLabel={`${name}, ${badge.text}${hasFix(employee) ? '' : ', no map location'}`}
        >
          {content}
          <View style={styles.trailing} />
        </View>
      );
    }
    const fixed = employee;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openMap(fixed)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${badge.text}`}
        accessibilityHint="Shows where they clocked in"
      >
        {content}
        <MaterialCommunityIcons name="map-marker-outline" size={18} color={C.muted} style={styles.trailing} />
      </TouchableOpacity>
    );
  };

  const day = state.kind === 'ready' ? dayOf(state.date) : null;
  const subtitle =
    state.kind === 'ready'
      ? [day ? fullDateText(day) : null, `updated ${clockText(state.fetchedAt.getHours(), state.fetchedAt.getMinutes())}`]
          .filter(Boolean)
          .join(' · ')
      : null;

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
      </TouchableOpacity>
      <View style={styles.headerText} pointerEvents="none">
        <Text style={styles.headerTitle} numberOfLines={1}>Team Today</Text>
        {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {/* Everyone with a position on one map. Absent rather than disabled when nobody has one. */}
      {pins.length > 0 && CAN_MAP ? (
        <TouchableOpacity
          onPress={() => openMap()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={`Show ${pins.length} clock-in ${pins.length === 1 ? 'location' : 'locations'} on the map`}
        >
          <MaterialCommunityIcons name="map-marker-multiple-outline" size={22} color={C.ink} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (state.kind !== 'ready') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <AuthBackdrop scriptLines={[]} />
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {header}
          {state.kind === 'loading' ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={C.blue} />
            </View>
          ) : state.denied ? (
            // No retry: asking again cannot succeed. The back arrow is the way out.
            <View style={styles.pad}>
              <LeaveState icon="lock-outline" title="No access to team attendance" body={state.message} tone="danger" />
            </View>
          ) : (
            <View style={styles.pad}>
              <LeaveState icon="cloud-off-outline" title="Could not load team attendance" body={state.message} tone="danger" onRetry={retry} />
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        {header}

        {employees.length > 0 ? (
          <>
            <ChipRow items={chips} value={filter} onChange={setFilter} />
            <View style={styles.search}>
              <MaterialCommunityIcons name="magnify" size={20} color={C.muted} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search name, role or department"
                placeholderTextColor={C.muted}
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search employees"
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')} style={styles.clear} accessibilityRole="button" accessibilityLabel="Clear search">
                  <MaterialCommunityIcons name="close-circle" size={18} color={C.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(e) => e.employeeId}
          renderItem={renderRow}
          style={styles.flex}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={7}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { void onRefresh(); }} colors={[C.blue]} tintColor={C.blue} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group-outline" size={36} color={C.muted} />
              <Text style={styles.emptyTitle}>
                {query.trim() && employees.length > 0 ? 'No one matches your search' : EMPTY_TEXT[filter]}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { paddingHorizontal: 16 },

  header: { minHeight: 52, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: {
    ...StyleSheet.absoluteFillObject,
    left: 60,
    right: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 1 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    marginHorizontal: 16,
    marginTop: 10,
    paddingLeft: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FFFFFF',
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 },
  clear: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  listContent: { paddingHorizontal: 16, paddingTop: 10 },

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    marginBottom: 10,
    minHeight: 62,
    shadowColor: C.blue,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  // Initials in ink on grey: blue is kept for buttons and the active chip.
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREY_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: C.ink, letterSpacing: 0.5 },
  avatarTextDim: { color: C.muted },

  details: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  code: { flexShrink: 0, maxWidth: 90, fontSize: 12, color: C.muted },
  role: { fontSize: 12, color: C.body, marginTop: 1 },

  // No maxWidth: at a large font size the name column gives way, never the time.
  status: { flexShrink: 0, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // The same width with or without the marker, so the badges line up down the list.
  trailing: { width: 18 },
});

export default EmployeeListScreen;
