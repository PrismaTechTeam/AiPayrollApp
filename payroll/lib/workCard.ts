/**
 * Reading a work card day the way the HR grid reads it.
 *
 * The server does not store "In 1 / Out 1 / In 2 / Out 2" — those columns are
 * built from the day's punch list. This mirrors the web grid so the phone and
 * the desk agree about what a day looked like.
 */
import type { WorkCardDay } from '../api/services/attendanceService';

/** One clock-in and the clock-out that closed it. Either half can be missing. */
export interface DayPair {
  in: string | null;
  out: string | null;
}

/** "18:03:00" or "2026-09-09T18:03:00+08:00" → "18:03". */
function hhmm(value: string): string {
  // TimeOnly arrives as HH:mm:ss with no date; slicing beats Date parsing,
  // which would read it as an invalid date and give NaN.
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  const d = new Date(withZone);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * The day's punches as in/out pairs, in the order they happened.
 *
 * Pairs go strictly by time, not by the IN/OUT label the device wrote. A gate
 * reader set to the wrong mode stamps two INs in a row, and a day that reads
 * IN IN OUT OUT is far more often one shift with a bad label than two shifts.
 * The web grid decided this first; the phone matching it matters more than
 * either of them being clever.
 *
 * Falls back to the day's summary pair when the punch list is empty, which is
 * what an imported or hand-adjusted day looks like.
 */
export function dayPairs(day: WorkCardDay): DayPair[] {
  const punches = [...(day.punches ?? [])].sort((a, b) => a.punchTime.localeCompare(b.punchTime));

  if (punches.length === 0) {
    if (!day.firstPunchIn && !day.lastPunchOut) return [];
    return [{ in: day.firstPunchIn ? hhmm(day.firstPunchIn) : null, out: day.lastPunchOut ? hhmm(day.lastPunchOut) : null }];
  }

  const pairs: DayPair[] = [];
  for (let i = 0; i < punches.length; i += 2) {
    pairs.push({
      in: hhmm(punches[i].punchTime),
      out: punches[i + 1] ? hhmm(punches[i + 1].punchTime) : null,
    });
  }
  return pairs;
}

/** Minutes as "1h 20m", or "20m" under the hour. Empty string at zero. */
export function minutesText(minutes: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Hours as "8.1 h". Empty string at zero, so a rest day shows nothing. */
export function hoursText(hours: number): string {
  if (!hours) return '';
  return `${hours.toFixed(1)} h`;
}

export interface DayLook {
  label: string;
  fg: string;
  bg: string;
}

/**
 * What to call a day and how to colour it.
 *
 * Status carries more than day type: a WORKING day can be OK, LATE or ABSENT,
 * and the employee cares about that difference far more than about the day type
 * on its own.
 */
export function dayLook(day: WorkCardDay): DayLook {
  if (day.isAbsent || day.status === 'ABSENT') return { label: 'Absent', fg: '#B91C1C', bg: '#FEF2F2' };
  // Nearly every exception the engine writes is a punch that is not there ("No punch records",
  // "Missing check-out"). "Check" told the employee something was wrong without saying what.
  if (day.hasException || day.status === 'EXCEPTION') return { label: 'Missing punch', fg: '#B45309', bg: '#FFF7ED' };

  switch (day.status) {
    case 'LATE':
      return { label: 'Late', fg: '#B45309', bg: '#FFF7ED' };
    case 'EARLY_OUT':
      return { label: 'Early out', fg: '#B45309', bg: '#FFF7ED' };
    case 'LATE_EARLY':
      return { label: 'Late & early', fg: '#B45309', bg: '#FFF7ED' };
    case 'LEAVE':
      return { label: day.leaveType ? leaveWord(day.leaveType) : 'Leave', fg: '#4F46E5', bg: '#EEF2FF' };
    case 'PH':
      return { label: 'Holiday', fg: '#7C3AED', bg: '#F5F3FF' };
    case 'PH_WORK':
      return { label: 'Holiday work', fg: '#7C3AED', bg: '#F5F3FF' };
    case 'REST':
      return { label: 'Rest day', fg: '#64748B', bg: '#F1F5F9' };
    case 'REST_WORK':
      return { label: 'Rest work', fg: '#0F766E', bg: '#ECFDF5' };
    // Both of these used to fall through to `default` and read as a green "Present":
    // a day still being worked, and a day that has not happened yet. Neither is present.
    case 'IN_PROGRESS':
      return { label: 'Clocked in', fg: '#2F6BFF', bg: '#EEF3FF' };
    case 'SCHEDULED':
      return { label: 'Upcoming', fg: '#94A3B8', bg: '#F8FAFD' };
    case 'NOT_EMPLOYED':
      return { label: 'Not employed', fg: '#64748B', bg: '#F1F5F9' };
    case 'NOT_PROCESSED':
      // Not an error: the engine simply has not run for this day yet.
      return { label: 'Pending', fg: '#64748B', bg: '#F1F5F9' };
    case 'OT_REVIEW':
      return { label: 'OT review', fg: '#B45309', bg: '#FFF7ED' };
    default:
      return { label: 'Present', fg: '#15803D', bg: '#ECFDF5' };
  }
}

function leaveWord(code: string): string {
  switch (code.toUpperCase()) {
    case 'AL':
      return 'Annual leave';
    case 'MC':
      return 'Sick leave';
    case 'UP':
      return 'Unpaid leave';
    default:
      return 'Leave';
  }
}

/**
 * A day nobody was meant to work: no times, no "absent", nothing to explain.
 * Leave counts: a leave day under a "No punches" line read as if something were missing.
 */
export function isOffDay(day: WorkCardDay): boolean {
  return (
    (day.dayType === 'REST' ||
      day.dayType === 'HOLIDAY' ||
      day.dayType === 'LEAVE' ||
      day.dayType === 'NOT_EMPLOYED') &&
    (day.punches?.length ?? 0) === 0
  );
}

/**
 * Whether a day is missing a punch the employee can ask HR to add, and which one.
 *
 * An open pair says exactly which half is gone. An absence or an exception with no
 * times at all is most likely a missed clock-in. An exception whose pairs are all
 * complete is still worth asking about, but the phone cannot tell which punch, so
 * the form opens with the type unchosen rather than guessing.
 */
export function missingPunch(day: WorkCardDay): { missing: boolean; punchType: 'IN' | 'OUT' | null } {
  if (isOffDay(day)) return { missing: false, punchType: null };

  const pairs = dayPairs(day);
  const open = pairs.find((p) => !p.in || !p.out);
  if (open) return { missing: true, punchType: open.in ? 'OUT' : 'IN' };

  const flagged = day.isAbsent || day.status === 'ABSENT' || day.hasException || day.status === 'EXCEPTION';
  if (!flagged) return { missing: false, punchType: null };
  return { missing: true, punchType: pairs.length === 0 ? 'IN' : null };
}

export interface MonthTotals {
  worked: number;
  present: number;
  late: number;
  absent: number;
  otHours: number;
}

/** Adds up only the days that have happened; future rows contribute nothing. */
export function monthTotals(days: WorkCardDay[]): MonthTotals {
  const totals: MonthTotals = { worked: 0, present: 0, late: 0, absent: 0, otHours: 0 };

  for (const day of days) {
    totals.worked += day.workedMinutes ?? 0;
    totals.otHours += (day.ot15Hours ?? 0) + (day.ot20Hours ?? 0) + (day.ot30Hours ?? 0);
    if (day.isAbsent || day.status === 'ABSENT') totals.absent += 1;
    else if ((day.workedMinutes ?? 0) > 0) totals.present += 1;
    if ((day.lateMinutes ?? 0) > 0) totals.late += 1;
  }

  return totals;
}
