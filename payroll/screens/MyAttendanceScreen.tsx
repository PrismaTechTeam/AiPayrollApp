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
 *
 * A day with a punch missing opens the missed-punch form with that day and that
 * punch already filled in. Fixing a day used to mean going back up, finding the
 * request page, and typing in by hand the date the card had just shown.
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
import { LeaveState } from '../components/leave/LeaveUi';
import { PUNCH_REQUEST_DAYS_BACK, localIsoDate } from '../components/attendance/PunchRequestUi';
import attendanceService, { WorkCard, WorkCardDay } from '../api/services/attendanceService';
import { serverMessage } from '../lib/serverMessage';
import { dayPairs, dayLook, hoursText, isOffDay, minutesText, missingPunch, monthTotals } from '../lib/workCard';

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
  // The month the page is asking about now. Any reply for another month is dropped:
  // stepping back twice quickly let September's answer, arriving last, land under
  // August's name -- every focus re-run set `alive` true again, so it never caught it.
  const wanted = useRef('');

  const fetchCard = useCallback(async (m: number, y: number) => {
    const key = `${y}-${m}`;
    wanted.current = key;
    try {
      const card = await attendanceService.getMyWorkCard(m, y);
      if (!alive.current || wanted.current !== key) return;
      setLoad({ kind: 'ready', card });
    } catch (err) {
      if (!alive.current || wanted.current !== key) return;
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

  const retry = () => {
    setLoad({ kind: 'loading' });
    void fetchCard(month, year);
  };

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

  // Which days can still be asked about. The server refuses a punch older than 60 days or in
  // a month HR has finalised, and today is still being worked -- a clock-out that has not
  // happened yet is not missing.
  const askable = useMemo(() => {
    const earliest = localIsoDate(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - PUNCH_REQUEST_DAYS_BACK),
    );
    const todayIso = localIsoDate(today);
    const finalized = load.kind === 'ready' && load.card.isFinalized;
    return (date: string) => {
      const day = date.slice(0, 10);
      return !finalized && day >= earliest && day < todayIso;
    };
  }, [load, today]);

  const askHr = (day: WorkCardDay, punchType: 'IN' | 'OUT' | null) => {
    const date = day.date.slice(0, 10);
    navigation.navigate('CreatePunchRequest', punchType ? { date, punchType } : { date });
  };

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
          </View>
        </View>

        {/* A missed punch is fixed by asking HR, not on this page, which only reads.
            Above the month bar because it is not about the month on screen. */}
        <TouchableOpacity
          style={styles.forgot}
          onPress={() => navigation.navigate('PunchRequests')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Missed a punch? Ask HR"
        >
          <MaterialCommunityIcons name="clock-edit-outline" size={18} color={C.blue} />
          <Text style={styles.forgotText}>Missed a punch?</Text>
          <Text style={styles.forgotAction}>Ask HR</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={C.muted} />
        </TouchableOpacity>

        {/* Month */}
        <View style={styles.monthBar}>
          <TouchableOpacity
            onPress={() => step(-1)}
            style={styles.monthArrow}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
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
            accessibilityState={{ disabled: atCurrentMonth }}
          >
            <MaterialCommunityIcons name="chevron-right" size={24} color={atCurrentMonth ? C.line : C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
        >
          {load.kind === 'loading' ? (
            <View style={styles.centre}>
              <ActivityIndicator color={C.blue} />
            </View>
          ) : load.kind === 'failed' ? (
            <LeaveState
              icon="cloud-off-outline"
              title="Could not load this month"
              body={load.message}
              tone="danger"
              onRetry={retry}
            />
          ) : days.length === 0 ? (
            atCurrentMonth ? (
              <LeaveState
                icon="calendar-blank-outline"
                title="Nothing recorded yet"
                body="No punches this month so far. Days appear here as you clock in and out."
              />
            ) : (
              <LeaveState
                icon="calendar-blank-outline"
                title={`No attendance in ${MONTHS[month - 1]}`}
                body={`Nothing was recorded for you in ${MONTHS[month - 1]} ${year}.`}
              />
            )
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

              {days.map((day) => {
                const gap = missingPunch(day);
                const canAsk = gap.missing && askable(day.date);
                return (
                  <DayCard
                    key={day.date}
                    day={day}
                    onAskHr={canAsk ? () => askHr(day, gap.punchType) : undefined}
                  />
                );
              })}

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
    <Text style={[styles.totalsValue, tone ? { color: tone } : null]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.totalsLabel}>{label}</Text>
  </View>
);

/** One day. Tappable only when a punch is missing and HR can still be asked to add it. */
const DayCard: React.FC<{ day: WorkCardDay; onAskHr?: () => void }> = ({ day, onAskHr }) => {
  const look = dayLook(day);
  const pairs = dayPairs(day);
  const off = isOffDay(day);
  const dayNumber = day.date.slice(8, 10);
  const worked = hoursText(day.workedHours);

  const body = (
    <>
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

        {onAskHr ? (
          <View style={styles.askRow}>
            <MaterialCommunityIcons name="clock-edit-outline" size={14} color={C.blue} />
            <Text style={styles.askText}>Ask HR to add the missing punch</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={C.blue} />
          </View>
        ) : null}
      </View>
    </>
  );

  if (!onAskHr) return <View style={styles.card}>{body}</View>;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onAskHr}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${day.dayOfWeek} ${Number(dayNumber)}, ${look.label}. Ask HR to add the missing punch.`}
    >
      {body}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 8, marginBottom: 4 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink },

  forgot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  forgotText: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink },
  forgotAction: { fontSize: 13, fontWeight: '700', color: C.blue },

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  monthArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  monthArrowOff: { opacity: 0.5 },
  monthText: { fontSize: 16, fontWeight: '700', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingBottom: 24 },

  centre: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  totals: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  totalsCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  totalsRule: { width: 1, height: 28, backgroundColor: C.line },
  totalsValue: { fontSize: 17, fontWeight: '800', color: C.ink },
  totalsLabel: { fontSize: 12, color: C.muted, marginTop: 2 },

  otRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  otText: { flex: 1, fontSize: 13, color: C.body },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  dateBlock: { width: 40, alignItems: 'center' },
  dateNumber: { fontSize: 20, fontWeight: '800', color: C.ink },
  dateWeekday: { fontSize: 11, fontWeight: '600', color: C.muted, marginTop: 1 },

  cardBody: { flex: 1, gap: 5 },
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

  askRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  askText: { flex: 1, fontSize: 12, fontWeight: '700', color: C.blue },

  finalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8 },
  finalText: { fontSize: 12, color: C.muted },
});

export default MyAttendanceScreen;
