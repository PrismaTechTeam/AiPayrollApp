/**
 * My Attendance — the employee's own month, read from the work card.
 *
 * This is the record, not the clock. Punching lives on its own screen behind the
 * Punch button; this page never writes anything. Keeping them apart was the
 * point: a page that both shows a month and takes a punch is two pages wearing
 * one hat, and the punch button is the thing people need to hit in a hurry.
 *
 * The data is the same work card HR reads, so a disagreement about a day is a
 * disagreement about one number both sides can see, not about two different
 * screens that were never going to match.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import attendanceService, { WorkCard, WorkCardDay } from '../api/services/attendanceService';
import { serverMessage } from '../lib/serverMessage';
import { dayPairs, dayLook, hoursText, isOffDay, minutesText, monthTotals } from '../lib/workCard';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; card: WorkCard }
  | { kind: 'failed'; message: string };

export const MyAttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const today = useRef(new Date()).current;

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);

  const fetchCard = useCallback(async (m: number, y: number) => {
    try {
      const card = await attendanceService.getMyWorkCard(m, y);
      if (!alive.current) return;
      setLoad({ kind: 'ready', card });
    } catch (err) {
      if (!alive.current) return;
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load your attendance.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      setLoad({ kind: 'loading' });
      void fetchCard(month, year);
      return () => {
        alive.current = false;
      };
    }, [fetchCard, month, year]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCard(month, year);
    if (alive.current) setRefreshing(false);
  }, [fetchCard, month, year]);

  const step = (by: number) => {
    const next = new Date(year, month - 1 + by, 1);
    // Nothing exists ahead of this month, so the forward arrow stops there
    // rather than loading a page of blank future days.
    if (next > new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  const atCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();

  /**
   * The days worth showing.
   *
   * A month always comes back whole, so the current month arrives with three
   * weeks of empty future rows. Cutting them keeps the list about what has
   * happened.
   *
   * Also drops days that carry nothing at all: no punches, no worked time, and a
   * status the engine has not written yet. Those are not absences and not rest
   * days -- they are days the system has no opinion about, and thirty identical
   * grey cards saying "no punches" bury the handful of days that do matter.
   * A real absence has ABSENT or isAbsent and stays.
   */
  const days = useMemo(() => {
    if (load.kind !== 'ready') return [] as WorkCardDay[];
    const cutoff = atCurrentMonth ? today.getDate() : 32;

    return load.card.days
      .filter((d) => {
        const dayNumber = Number(d.date.slice(8, 10));
        if (dayNumber > cutoff) return false;
        if (d.status === 'NOT_EMPLOYED') return false;

        const blank =
          (d.punches?.length ?? 0) === 0 &&
          (d.workedMinutes ?? 0) === 0 &&
          !d.isAbsent &&
          !d.hasException &&
          (d.status === 'NOT_PROCESSED' || !d.status);
        return !blank;
      })
      .reverse();
  }, [load, atCurrentMonth, today]);

  const totals = useMemo(() => monthTotals(days), [days]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>My Attendance</Text>
            <Text style={styles.headerSubtitle}>Your record, day by day</Text>
          </View>
        </View>

        {/* Month */}
        <View style={styles.monthBar}>
          <TouchableOpacity onPress={() => step(-1)} style={styles.monthArrow} accessibilityRole="button" accessibilityLabel="Previous month">
            <MaterialCommunityIcons name="chevron-left" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {MONTHS[month - 1]} {year}
          </Text>
          <TouchableOpacity
            onPress={() => step(1)}
            style={[styles.monthArrow, atCurrentMonth ? styles.monthArrowOff : null]}
            disabled={atCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <MaterialCommunityIcons name="chevron-right" size={24} color={atCurrentMonth ? C.line : C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
        >
          {load.kind === 'loading' ? (
            <View style={styles.centre}>
              <ActivityIndicator color={C.blue} />
            </View>
          ) : load.kind === 'failed' ? (
            <View style={styles.centre}>
              <MaterialCommunityIcons name="cloud-off-outline" size={40} color={C.muted} />
              <Text style={styles.emptyTitle}>Could not load this month</Text>
              <Text style={styles.emptyBody}>{load.message}</Text>
              <TouchableOpacity style={styles.retry} onPress={() => void onRefresh()} accessibilityRole="button">
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : days.length === 0 ? (
            <View style={styles.centre}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={40} color={C.muted} />
              <Text style={styles.emptyTitle}>Nothing recorded yet</Text>
              <Text style={styles.emptyBody}>
                No punches and no attendance on this month so far. It fills in as you clock in and out.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.totals}>
                <Totals label="Worked" value={minutesText(totals.worked) || '0m'} />
                <View style={styles.totalsRule} />
                <Totals label="Present" value={String(totals.present)} />
                <View style={styles.totalsRule} />
                <Totals label="Late" value={String(totals.late)} tone={totals.late > 0 ? '#B45309' : undefined} />
                <View style={styles.totalsRule} />
                <Totals label="Absent" value={String(totals.absent)} tone={totals.absent > 0 ? C.danger : undefined} />
              </View>

              {totals.otHours > 0 ? (
                <View style={styles.otRow}>
                  <MaterialCommunityIcons name="clock-plus-outline" size={18} color={C.blue} />
                  <Text style={styles.otText}>{totals.otHours.toFixed(1)} hours of overtime this month</Text>
                </View>
              ) : null}

              {days.map((day) => (
                <DayCard key={day.date} day={day} />
              ))}

              {load.card.isFinalized ? (
                <View style={styles.finalRow}>
                  <MaterialCommunityIcons name="lock-check-outline" size={16} color={C.muted} />
                  <Text style={styles.finalText}>This month has been finalised by HR.</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const Totals: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <View style={styles.totalsCell}>
    <Text style={[styles.totalsValue, tone ? { color: tone } : null]}>{value}</Text>
    <Text style={styles.totalsLabel}>{label}</Text>
  </View>
);

const DayCard: React.FC<{ day: WorkCardDay }> = ({ day }) => {
  const look = dayLook(day);
  const pairs = dayPairs(day);
  const off = isOffDay(day);
  const dayNumber = day.date.slice(8, 10);
  const worked = hoursText(day.workedHours);

  return (
    <View style={styles.card}>
      <View style={styles.dateBlock}>
        <Text style={styles.dateNumber}>{dayNumber}</Text>
        <Text style={styles.dateWeekday}>{day.dayOfWeek}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={[styles.pill, { backgroundColor: look.bg }]}>
            <Text style={[styles.pillText, { color: look.fg }]}>{look.label}</Text>
          </View>
          {worked ? <Text style={styles.worked}>{worked}</Text> : null}
        </View>

        {off ? null : pairs.length === 0 ? (
          <Text style={styles.noTimes}>No punches</Text>
        ) : (
          pairs.map((pair, index) => (
            <View key={index} style={styles.pairRow}>
              <MaterialCommunityIcons name="login" size={14} color="#16A34A" />
              <Text style={styles.pairTime}>{pair.in ?? '--:--'}</Text>
              <MaterialCommunityIcons name="arrow-right" size={13} color={C.muted} />
              <MaterialCommunityIcons name="logout" size={14} color={C.danger} />
              <Text style={styles.pairTime}>{pair.out ?? '--:--'}</Text>
            </View>
          ))
        )}

        {/* Only the minutes that cost the employee something get a line. */}
        {day.lateMinutes > 0 || day.earlyOutMinutes > 0 ? (
          <Text style={styles.penalty}>
            {[
              day.lateMinutes > 0 ? `${minutesText(day.lateMinutes)} late` : null,
              day.earlyOutMinutes > 0 ? `${minutesText(day.earlyOutMinutes)} early out` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}

        {day.ot15Hours + day.ot20Hours + day.ot30Hours > 0 ? (
          <Text style={styles.ot}>
            OT {(day.ot15Hours + day.ot20Hours + day.ot30Hours).toFixed(1)} h
          </Text>
        ) : null}

        {day.hasException && day.exceptionNotes ? (
          <Text style={styles.note}>{day.exceptionNotes}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  monthArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  monthArrowOff: { opacity: 0.5 },
  monthText: { fontSize: 16, fontWeight: '700', color: C.ink },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 6 },
  emptyBody: { fontSize: 14, color: C.body, textAlign: 'center', paddingHorizontal: 30 },
  retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  totals: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  totalsCell: { flex: 1, alignItems: 'center' },
  totalsRule: { width: 1, height: 28, backgroundColor: C.line },
  totalsValue: { fontSize: 17, fontWeight: '800', color: C.ink },
  totalsLabel: { fontSize: 12, color: C.muted, marginTop: 3 },

  otRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  otText: { flex: 1, fontSize: 13, color: C.body },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  dateBlock: { width: 44, alignItems: 'center' },
  dateNumber: { fontSize: 20, fontWeight: '800', color: C.ink },
  dateWeekday: { fontSize: 11, fontWeight: '600', color: C.muted, marginTop: 1 },

  cardBody: { flex: 1, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
  worked: { fontSize: 14, fontWeight: '700', color: C.ink },

  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pairTime: { fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
  noTimes: { fontSize: 13, color: C.muted },

  penalty: { fontSize: 12, color: '#B45309' },
  ot: { fontSize: 12, color: C.blue, fontWeight: '600' },
  note: { fontSize: 12, color: C.body, fontStyle: 'italic' },

  finalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8 },
  finalText: { fontSize: 12, color: C.muted },
});

export default MyAttendanceScreen;
