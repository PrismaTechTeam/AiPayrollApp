/**
 * The pieces the two punch-request screens share: what a punch is called, how a
 * request's status looks, how its time is written, and the card itself.
 *
 * One place, so "Break out" on the form is the same words and the same icon as
 * "Break out" on the list the employee checks afterwards. The iOS picker sheet
 * lives here too, so any other form with a date or time field can take the same
 * Cancel/Done sheet rather than another bare spinner.
 *
 * HR's side lives here as well: the filter chips the team screens share, and the
 * approval card for HR's punch-request queue, so a punch reads the same to the
 * person who asked for it and to the person deciding it.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import { parseDate } from '../requests/RequestUi';
import type { PunchRequest, PunchType, TeamPunchRequest } from '../../api/services/attendanceService';

// ── Punch types ───────────────────────────────────────────────────────

// An ordinary clock-out is not an error, so it is slate rather than the danger red it
// used to be; red is kept for Reject and for failures. Violet left with the pastel look.
export const PUNCH_LOOK: Record<PunchType, { label: string; icon: IconName; tint: string }> = {
  IN: { label: 'Clock in', icon: 'login', tint: '#16A34A' },
  OUT: { label: 'Clock out', icon: 'logout', tint: '#475569' },
  BREAK_OUT: { label: 'Break out', icon: 'coffee-outline', tint: '#D97706' },
  BREAK_IN: { label: 'Break in', icon: 'coffee-off-outline', tint: '#0891B2' },
};

/** In the order the form offers them: the day's two ends first, the break second. */
export const PUNCH_TYPES: PunchType[] = ['IN', 'OUT', 'BREAK_OUT', 'BREAK_IN'];

/**
 * How far back a punch can be asked for. The server refuses anything older than
 * 60 days to the minute, so the phone offers one day fewer: the oldest day at a
 * time earlier than now would pass the form and then be refused.
 */
export const PUNCH_REQUEST_DAYS_BACK = 59;

/** The local calendar day as "2026-09-15", the shape the work card uses for its dates. */
export function localIsoDate(date: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

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

/** "Thu, 8 Oct 2026" — the punch screen's date line, in the same words as dayLabel. */
export function fullDateText(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
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

/**
 * The iOS date or time wheel, in a sheet with Cancel and Done.
 *
 * Dropped onto the page bare, the iOS spinner had no background, no way to close
 * it without changing a value, and sat over the home indicator. Worse, iOS fires
 * onChange every time any one wheel settles, so a picker that committed on change
 * closed after the hour wheel stopped and the minutes could not be set in the same
 * go. The wheels here only move a draft; Done commits it and Cancel throws it away.
 *
 * Android keeps its own native dialog, which already has both buttons.
 */
export const PickerSheet: React.FC<{
  visible: boolean;
  mode: 'date' | 'time';
  title: string;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onDone: (value: Date) => void;
}> = ({ visible, mode, title, value, minimumDate, maximumDate, onCancel, onDone }) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  // Each opening starts from the field's current value, not from the last abandoned draft.
  useEffect(() => {
    if (visible) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.sheetWrap}>
        <Pressable style={styles.sheetBackdrop} onPress={onCancel} accessibilityLabel="Close without choosing" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.sheetHead}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.sheetButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.sheetCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle} numberOfLines={1}>{title}</Text>
            <TouchableOpacity
              onPress={() => onDone(draft)}
              style={[styles.sheetButton, styles.sheetButtonEnd]}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={draft}
            mode={mode}
            display="spinner"
            onChange={(_event, next) => {
              if (next) setDraft(next);
            }}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            // The sheet is always white; a phone in dark mode would otherwise draw white digits on it.
            themeVariant="light"
            textColor={C.ink}
          />
        </View>
      </View>
    </Modal>
  );
};

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
          {/* Wraps rather than truncates: at a large font size a single line cut off the
              time, the one fact on the card that matters. */}
          <Text style={styles.cardMeta}>{punchWhenText(item.punchTime)}</Text>
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

// ── HR: filter chips, people, the approval card ───────────────────────

/**
 * The HR filter row: one chip per state, the active one blue. It scrolls sideways
 * rather than shrinking, so a label is never clipped at a large font size.
 */
export function ChipRow<K extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      style={styles.chipScroll}
    >
      {items.map((item) => {
        const on = item.key === value;
        const text = item.count === undefined ? item.label : `${item.label} ${item.count}`;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onChange(item.key)}
            activeOpacity={0.8}
            // Drawn 34pt tall; the slop takes the tap target to 44.
            hitSlop={{ top: 5, bottom: 5 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={text}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{text}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/** Two letters off a name, first and last word; one word gives one letter. */
export function personInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Day arithmetic in Malaysia time (UTC+8, no daylight saving), so "waiting 3 days" turns
// over at midnight in KL whatever zone the phone is set to, as on the other approval cards.
const MYT_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const mytDayNumber = (d: Date) => Math.floor((d.getTime() + MYT_MS) / DAY_MS);

/** "4 Sep", with the year only when it is not this year. */
function mytShortDate(d: Date): string {
  const m = new Date(d.getTime() + MYT_MS);
  const thisYear = new Date(Date.now() + MYT_MS).getUTCFullYear();
  const year = m.getUTCFullYear() === thisYear ? '' : ` ${m.getUTCFullYear()}`;
  return `${m.getUTCDate()} ${SHORT_MONTHS[m.getUTCMonth()]}${year}`;
}

/** "Asked 4 Sep · waiting 3 days" while it waits; "Asked 4 Sep · decided 6 Sep" after. */
export function askedText(item: Pick<PunchRequest, 'createdAt' | 'decidedAt' | 'status'>): string {
  const asked = parseDate(item.createdAt);
  if (!asked) return '';
  const lead = `Asked ${mytShortDate(asked)}`;
  if ((item.status ?? '').toUpperCase() !== 'REQUESTED') {
    const decided = parseDate(item.decidedAt);
    return decided ? `${lead} · decided ${mytShortDate(decided)}` : lead;
  }
  const days = Math.max(mytDayNumber(new Date()) - mytDayNumber(asked), 0);
  return `${lead} · ${days === 0 ? 'today' : `waiting ${days} ${days === 1 ? 'day' : 'days'}`}`;
}

/**
 * One employee's punch request in HR's queue, in the same shape as the leave, request
 * and claim approval cards: who, what, when, why, how long it has waited, and the two
 * decisions.
 *
 * There is no details page for a punch request, because the card already holds every
 * fact; a long reason or note opens in place instead. Buttons appear only when the
 * caller passes `onApprove`/`onReject`, which the screen withholds for a person's own
 * request and for a role that cannot decide.
 */
export const TeamPunchCard: React.FC<{
  item: TeamPunchRequest;
  /** Shown as a muted line in place of the buttons, e.g. "Your own request". */
  footnote?: string | null;
  busy?: 'approve' | 'reject' | null;
  onApprove?: () => void;
  onReject?: () => void;
}> = ({ item, footnote = null, busy = null, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const look = lookOf(item.punchType);
  const status = (item.status ?? '').toUpperCase();
  const pending = status === 'REQUESTED';
  const reason = (item.reason ?? '').trim();
  const note = (item.approverNotes ?? '').trim();
  // Roughly two lines at 14pt on a phone. Only then does tapping the card do anything,
  // so a short reason never sits on a card that reacts to nothing.
  const long = reason.length > 80 || reason.includes('\n') || note.length > 80 || note.includes('\n');
  const decide = pending && onApprove && onReject;
  const name = item.employeeName || 'Unnamed employee';

  const body = (
    <>
      <View style={styles.apTop}>
        <View style={styles.apAvatar}>
          <Text style={styles.apAvatarText}>{personInitials(item.employeeName)}</Text>
        </View>
        <View style={styles.apWho}>
          <Text style={styles.apName} numberOfLines={1}>{name}</Text>
          {item.employeeCode ? <Text style={styles.apCode} numberOfLines={1}>{item.employeeCode}</Text> : null}
        </View>
        {pending ? null : <PunchStatusPill status={item.status} />}
      </View>

      <View style={styles.apType}>
        <View style={[styles.apDot, { backgroundColor: look.tint }]} />
        <Text style={styles.apTypeText}>{look.label}</Text>
      </View>

      {/* Never truncated: it wraps to a second line before it loses the time. */}
      <Text style={styles.apWhen}>{punchWhenText(item.punchTime)}</Text>

      {reason ? <Text style={styles.apReason} numberOfLines={open ? undefined : 2}>{reason}</Text> : null}

      {!pending && note ? (
        <Text style={[styles.apNote, status === 'REJECTED' && styles.apNoteRejected]} numberOfLines={open ? undefined : 2}>
          {status === 'REJECTED' ? 'Reason: ' : 'Note: '}
          {note}
        </Text>
      ) : null}

      <Text style={styles.apMeta}>{[askedText(item), footnote].filter(Boolean).join(' · ')}</Text>
    </>
  );

  return (
    <View style={styles.apCard}>
      {long ? (
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityHint={open ? 'Shows less' : 'Shows the whole reason'}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}

      {decide ? (
        <View style={styles.apActions}>
          <TouchableOpacity
            style={[styles.apButton, styles.apReject]}
            onPress={onReject}
            disabled={busy !== null}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Reject ${name}'s ${look.label.toLowerCase()} request`}
          >
            {busy === 'reject' ? (
              <ActivityIndicator size="small" color={C.danger} />
            ) : (
              <>
                <MaterialCommunityIcons name="close" size={18} color={C.danger} />
                <Text style={styles.apRejectText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.apButton, styles.apApprove, busy !== null && styles.apBusy]}
            onPress={onApprove}
            disabled={busy !== null}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Approve ${name}'s ${look.label.toLowerCase()} request`}
          >
            {busy === 'approve' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.apApproveText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.line,
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
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.dangerLine,
    backgroundColor: C.dangerBg,
  },
  withdrawText: { fontSize: 14, fontWeight: '700', color: C.danger },

  chipScroll: { flexGrow: 0 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  chip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 13, fontWeight: '600', color: C.ink, fontVariant: ['tabular-nums'] },
  chipTextOn: { color: '#FFFFFF' },

  apCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.blue,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  apTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  apAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  apAvatarText: { fontSize: 14, fontWeight: '700', color: C.ink, letterSpacing: 0.5 },
  apWho: { flex: 1, minWidth: 0 },
  apName: { fontSize: 15, fontWeight: '700', color: C.ink },
  apCode: { fontSize: 12, color: C.muted, marginTop: 1 },
  apType: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  apDot: { width: 8, height: 8, borderRadius: 4 },
  apTypeText: { fontSize: 14, fontWeight: '600', color: C.ink },
  apWhen: { fontSize: 14, color: C.ink, marginTop: 4, fontVariant: ['tabular-nums'] },
  apReason: { fontSize: 14, lineHeight: 20, color: C.body, marginTop: 6 },
  apNote: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 6 },
  apNoteRejected: { color: C.danger },
  apMeta: { fontSize: 12, color: C.muted, marginTop: 8 },
  apActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  apButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  apReject: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.danger },
  apRejectText: { fontSize: 15, fontWeight: '700', color: C.danger },
  apApprove: { backgroundColor: C.blue },
  apApproveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  apBusy: { opacity: 0.85 },

  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,27,45,0.35)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: C.ink,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  sheetButton: { minWidth: 72, height: 48, justifyContent: 'center', paddingHorizontal: 10 },
  sheetButtonEnd: { alignItems: 'flex-end' },
  sheetTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.ink },
  sheetCancel: { fontSize: 15, fontWeight: '600', color: C.body },
  sheetDone: { fontSize: 15, fontWeight: '700', color: C.blue },
});
