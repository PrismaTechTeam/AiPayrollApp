/**
 * The pieces the two punch-request screens share: what a punch is called, how a
 * request's status looks, how its time is written, and the card itself.
 *
 * One place, so "Break out" on the form is the same words and the same icon as
 * "Break out" on the list the employee checks afterwards.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import { parseDate } from '../requests/RequestUi';
import type { PunchRequest, PunchType } from '../../api/services/attendanceService';

// ── Punch types ───────────────────────────────────────────────────────

export const PUNCH_LOOK: Record<PunchType, { label: string; icon: IconName; tint: string }> = {
  IN: { label: 'Clock in', icon: 'login', tint: '#16A34A' },
  OUT: { label: 'Clock out', icon: 'logout', tint: '#DC2626' },
  BREAK_OUT: { label: 'Break out', icon: 'coffee-outline', tint: '#D97706' },
  BREAK_IN: { label: 'Break in', icon: 'coffee-off-outline', tint: '#7C3AED' },
};

/** In the order the form offers them: the day's two ends first, the break second. */
export const PUNCH_TYPES: PunchType[] = ['IN', 'OUT', 'BREAK_OUT', 'BREAK_IN'];

function lookOf(type: string | null | undefined) {
  const key = (type ?? '').toUpperCase() as PunchType;
  return PUNCH_LOOK[key] ?? { label: 'Punch', icon: 'clock-outline' as IconName, tint: C.body };
}

// ── Status ────────────────────────────────────────────────────────────

const STATUS_LOOK: Record<string, { label: string; bg: string; fg: string; icon: IconName }> = {
  REQUESTED: { label: 'Waiting for HR', bg: '#FFF4E5', fg: '#B45309', icon: 'clock-outline' },
  APPROVED: { label: 'Approved', bg: '#DCFCE7', fg: '#15803D', icon: 'check' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', fg: '#B91C1C', icon: 'close' },
  CANCELLED: { label: 'Withdrawn', bg: '#EEF2F7', fg: '#64748B', icon: 'minus' },
};

export const PunchStatusPill: React.FC<{ status: string }> = ({ status }) => {
  const look = STATUS_LOOK[(status ?? '').toUpperCase()] ?? STATUS_LOOK.REQUESTED;
  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]}>
      <MaterialCommunityIcons name={look.icon} size={13} color={look.fg} />
      <Text style={[styles.pillText, { color: look.fg }]}>{look.label}</Text>
    </View>
  );
};

// ── Dates and times ───────────────────────────────────────────────────
//
// Written out from the Date's own parts rather than toLocaleString, which gives
// "Sep 9, 2026" on one phone and "09/09/2026" on the next.

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today, 15 Sep 2026", "Yesterday, 14 Sep 2026", otherwise "Sat, 12 Sep 2026". */
export function dayLabel(date: Date): string {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const lead = sameDay(date, now) ? 'Today' : sameDay(date, yesterday) ? 'Yesterday' : WEEKDAYS[date.getDay()];
  return `${lead}, ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** 9:05 → "9:05 AM". */
export function clockText(hours: number, minutes: number): string {
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${`${minutes}`.padStart(2, '0')} ${suffix}`;
}

/** A request's punch time as one line: "Wed, 9 Sep 2026 · 9:01 AM". */
export function punchWhenText(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? `${dayLabel(d)} · ${clockText(d.getHours(), d.getMinutes())}` : '—';
}

/**
 * A local wall-clock moment as ISO with this phone's UTC offset attached,
 * e.g. "2026-09-15T08:58:00+08:00".
 *
 * toISOString() would convert to UTC and drop the offset, leaving the server to
 * guess which 08:58 the employee meant.
 */
export function toOffsetIso(date: Date): string {
  const pad = (n: number) => `${Math.abs(n)}`.padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:00` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  );
}

// ── Bits ──────────────────────────────────────────────────────────────

/** The four punches, two by two. Mutually exclusive; the chosen one is the blue one. */
export const PunchTypeGrid: React.FC<{
  value: PunchType | null;
  onChange: (type: PunchType) => void;
}> = ({ value, onChange }) => (
  <View style={styles.grid}>
    {PUNCH_TYPES.map((type) => {
      const look = PUNCH_LOOK[type];
      const active = type === value;
      return (
        <TouchableOpacity
          key={type}
          style={[styles.choice, active && styles.choiceActive]}
          onPress={() => onChange(type)}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: active }}
          accessibilityLabel={look.label}
        >
          <MaterialCommunityIcons name={look.icon} size={19} color={active ? '#FFFFFF' : look.tint} />
          <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{look.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/** One request: which punch, when, where it stands, why, and what HR said. */
export const PunchRequestCard: React.FC<{
  item: PunchRequest;
  onWithdraw?: () => void;
  withdrawing?: boolean;
}> = ({ item, onWithdraw, withdrawing = false }) => {
  const look = lookOf(item.punchType);
  const status = (item.status ?? '').toUpperCase();
  const note = (item.approverNotes ?? '').trim();

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: `${look.tint}1A` }]}>
          <MaterialCommunityIcons name={look.icon} size={21} color={look.tint} />
        </View>
        <View style={styles.cardHead}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{look.label}</Text>
            <PunchStatusPill status={item.status} />
          </View>
          <Text style={styles.cardMeta} numberOfLines={1}>{punchWhenText(item.punchTime)}</Text>
        </View>
      </View>

      {item.reason ? <Text style={styles.reason} numberOfLines={3}>{item.reason}</Text> : null}

      {note ? (
        <View style={[styles.note, status === 'REJECTED' && styles.noteRejected]}>
          <Text style={[styles.noteLabel, status === 'REJECTED' && styles.noteLabelRejected]}>HR's note</Text>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}

      {status === 'REQUESTED' && onWithdraw ? (
        <TouchableOpacity
          style={styles.withdraw}
          onPress={onWithdraw}
          disabled={withdrawing}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Withdraw ${look.label} request`}
        >
          {withdrawing ? (
            <ActivityIndicator size="small" color={C.danger} />
          ) : (
            <>
              <MaterialCommunityIcons name="close-circle-outline" size={16} color={C.danger} />
              <Text style={styles.withdrawText}>Withdraw</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
  },
  choiceActive: { backgroundColor: C.blue, borderColor: C.blue },
  choiceText: { fontSize: 14, fontWeight: '700', color: C.ink },
  choiceTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardHead: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  cardMeta: { fontSize: 13, color: C.body, fontVariant: ['tabular-nums'] },

  reason: { fontSize: 14, lineHeight: 20, color: C.ink, marginTop: 12 },

  note: { backgroundColor: '#F1F5FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 },
  noteRejected: { backgroundColor: C.dangerBg },
  noteLabel: { fontSize: 11, fontWeight: '700', color: C.body, marginBottom: 2 },
  noteLabelRejected: { color: C.danger },
  noteText: { fontSize: 13, lineHeight: 18, color: C.body },

  withdraw: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.dangerLine,
    backgroundColor: C.dangerBg,
  },
  withdrawText: { fontSize: 14, fontWeight: '700', color: C.danger },
});
