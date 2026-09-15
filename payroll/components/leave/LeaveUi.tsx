/**
 * The pieces the leave screens share.
 *
 * One place so the same leave type is the same colour and the same icon whether
 * you meet it on the overview, in the history, or on its own page — and so the
 * "no entitlement limit" case is written once. That case is the whole reason
 * this file exists: unpaid leave has no allowance to count down from, and a
 * screen that prints "0 days remaining" for it is telling the employee they
 * cannot take it, which is false.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import { StatusPill, plainDate } from '../requests/RequestUi';
import type { LeaveApplication, MyLeaveEntitlement } from '../../api/services/leaveService';

// ── Getting about ─────────────────────────────────────────────────────

/**
 * The stack has no param list, so `navigate('X', params as never)`
 * does not type-check once a second argument is involved. One narrow cast,
 * written once here, rather than an `as any` at every call site.
 */
export function goTo(navigation: unknown, screen: string, params?: Record<string, unknown>): void {
  (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate(screen, params);
}

// ── Numbers and dates ─────────────────────────────────────────────────

/** 3 → "3", 2.5 → "2.5". Leave is counted in halves, so 3.0 must not read "3.0". */
export function dayNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

export function dayText(value: number | null | undefined): string {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return `${dayNumber(n)} ${n === 1 ? 'day' : 'days'}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A leave date arrives as a plain YYYY-MM-DD; splitting it beats parsing it into a Date and being shifted by a zone. */
function ymd(value: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const m = Number(match[2]);
  if (m < 1 || m > 12) return null;
  return { y: Number(match[1]), m, d: Number(match[3]) };
}

/**
 * "12 Mar 2026" for one day, "12 – 14 Mar 2026" for a range inside a month,
 * "28 Mar – 2 Apr 2026" across months, both years when it crosses new year.
 * The repeated half is dropped because a card has one line to say it in.
 *
 * Written out rather than assembled from toLocaleDateString: that returns
 * "Mar 12, 2026" on a US phone and "12/03/2026" on some others, and a range
 * built by slicing those strings apart comes out as nonsense.
 */
export function dateRangeText(start: string | null | undefined, end: string | null | undefined): string {
  const from = ymd(start);
  const to = ymd(end);
  if (!from) return to ? dateRangeText(end, end) : plainDate(start);

  const one = (p: { y: number; m: number; d: number }) => `${p.d} ${SHORT_MONTHS[p.m - 1]} ${p.y}`;
  if (!to || (from.y === to.y && from.m === to.m && from.d === to.d)) return one(from);

  if (from.y === to.y && from.m === to.m) return `${from.d} – ${one(to)}`;
  if (from.y === to.y) return `${from.d} ${SHORT_MONTHS[from.m - 1]} – ${one(to)}`;
  return `${one(from)} – ${one(to)}`;
}

// ── Look ──────────────────────────────────────────────────────────────

/**
 * Colours to fall back on when HR left the leave type's own colour blank.
 * Picked by code so a type keeps the same colour between screens and between
 * app launches, instead of shuffling every render.
 */
const FALLBACK_TINTS = ['#2F6BFF', '#7C3AED', '#0EA5E9', '#16A34A', '#EA580C', '#DB2777', '#0891B2'];

export function leaveTint(item: { color?: string | null; code?: string | null }): string {
  const raw = (item.color ?? '').trim();
  // Widened to six digits because leaveWash appends two alpha digits, and
  // "#F00" + "1A" is not a colour React Native will accept.
  if (/^#[0-9a-f]{3}$/i.test(raw)) return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;

  const code = item.code ?? '';
  let sum = 0;
  for (let i = 0; i < code.length; i += 1) sum += code.charCodeAt(i);
  return FALLBACK_TINTS[sum % FALLBACK_TINTS.length];
}

/** A soft wash of the tint for the icon disc. Kept at a fixed alpha so every row matches. */
export function leaveWash(tint: string): string {
  return `${tint}1A`;
}

const ICONS: Record<string, IconName> = {
  AL: 'palm-tree',
  MC: 'medical-bag',
  SL: 'medical-bag',
  HL: 'home-heart',
  CL: 'account-heart-outline',
  EL: 'alert-circle-outline',
  UL: 'cash-remove',
  ML: 'baby-carriage',
  PL: 'baby-face-outline',
  BL: 'book-open-variant',
  SP: 'airplane',
};

export function leaveIcon(code: string | null | undefined): IconName {
  return ICONS[(code ?? '').toUpperCase()] ?? 'calendar-blank-outline';
}

// ── Which entitlement speaks for the employee ─────────────────────────

/** The leave type code that means annual leave on this tenant. */
const ANNUAL_CODE = 'AL';

/**
 * The single entitlement a one-line summary should quote.
 *
 * There is no such thing as a total number of leave days. Adding annual to sick
 * to hospitalisation to compassionate gives a figure like "43 days left", most
 * of which is sick leave the employee hopes never to touch — and if they plan a
 * holiday against it they will be refused. Annual leave is the one people mean,
 * so it is the one that is shown, named, and never summed with anything else.
 *
 * Falls back to the first type that has a spendable number when this tenant has
 * no annual type (or has one HR never issued a row for): a real number for a
 * named type beats a blank, as long as the caller prints the name with it.
 */
export function annualEntitlement(items: MyLeaveEntitlement[]): MyLeaveEntitlement | null {
  const spendable = items.filter((i) => i.hasEntitlement && i.availableDays !== null);
  return (
    spendable.find((i) => (i.code ?? '').trim().toUpperCase() === ANNUAL_CODE)
    ?? spendable[0]
    ?? null
  );
}

/**
 * "Annual Leave" → "Annual". For the places with one line and no room to spend
 * it repeating the word "leave" next to a tile already titled My Leaves.
 */
export function shortLeaveName(item: { description?: string | null; code?: string | null }): string {
  const full = (item.description ?? '').trim();
  if (!full) return (item.code ?? 'Leave').trim().toUpperCase();
  return full.replace(/\s*leaves?$/i, '').trim() || full;
}

/**
 * How a type with no spendable number should be described — never as "0 days".
 *
 * An entitled type with no row for the year is an HR omission the employee can
 * do nothing about but should know of; an unpaid type simply has no allowance
 * to count down, and the employee can still take it.
 */
export function noBalanceText(item: MyLeaveEntitlement): string {
  return item.isEntitle && !item.isUnpaid ? 'No allowance set up for this year' : 'No entitlement limit';
}

// ── Bits ──────────────────────────────────────────────────────────────

export const SectionHeading: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, actionLabel, onAction }) => (
  <View style={styles.headingRow}>
    <Text style={styles.heading}>{title}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity onPress={onAction} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.headingAction}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/** Back one year, forward as far as this year. Nothing is issued past it. */
export const YearBar: React.FC<{
  year: number;
  maxYear: number;
  minYear?: number;
  onChange: (year: number) => void;
}> = ({ year, maxYear, minYear = 2000, onChange }) => {
  const canBack = year > minYear;
  const canForward = year < maxYear;

  return (
    <View style={styles.yearBar}>
      <TouchableOpacity
        onPress={() => canBack && onChange(year - 1)}
        disabled={!canBack}
        style={[styles.yearArrow, !canBack && styles.yearArrowOff]}
        accessibilityRole="button"
        accessibilityLabel="Previous year"
      >
        <MaterialCommunityIcons name="chevron-left" size={24} color={canBack ? C.ink : C.line} />
      </TouchableOpacity>
      <Text style={styles.yearText}>{year}</Text>
      <TouchableOpacity
        onPress={() => canForward && onChange(year + 1)}
        disabled={!canForward}
        style={[styles.yearArrow, !canForward && styles.yearArrowOff]}
        accessibilityRole="button"
        accessibilityLabel="Next year"
      >
        <MaterialCommunityIcons name="chevron-right" size={24} color={canForward ? C.ink : C.line} />
      </TouchableOpacity>
    </View>
  );
};

/** One leave application: what was taken, when, how long, and where it stands. */
export const LeaveCard: React.FC<{
  leave: LeaveApplication;
  onPress?: () => void;
  showType?: boolean;
}> = ({ leave, onPress, showType = true }) => {
  const tint = leaveTint({ color: leave.leaveTypeColor, code: leave.leaveTypeCode });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.cardIcon, { backgroundColor: leaveWash(tint) }]}>
        <MaterialCommunityIcons name={leaveIcon(leave.leaveTypeCode)} size={22} color={tint} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {showType ? leave.leaveTypeDescription || 'Leave' : dateRangeText(leave.startDate, leave.endDate)}
          </Text>
          <StatusPill status={leave.status} />
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {showType ? `${dateRangeText(leave.startDate, leave.endDate)} · ${dayText(leave.totalDays)}` : dayText(leave.totalDays)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * One leave type's allowance for the year.
 *
 * Two shapes, one row. With an entitlement it counts down and draws a bar. With
 * none it says so in words and shows a dash, because there is no number to show
 * and no bar to fill — the employee can still take the leave.
 *
 * The big number is what can be BOOKED, not what remains: the server refuses
 * against remaining-minus-pending, so a row led by remaining is a row that
 * invites a refusal. Pending and entitled sit underneath it, because an
 * employee who sees a number drop needs to see where the difference went.
 */
export const EntitlementRow: React.FC<{
  item: MyLeaveEntitlement;
  onPress: () => void;
  last?: boolean;
}> = ({ item, onPress, last = false }) => {
  const tint = leaveTint(item);
  const entitled = item.hasEntitlement && item.availableDays !== null;
  const total = (item.entitledDays ?? 0) + (item.carryForwardDays ?? 0);
  // Spoken for, not just spent: days awaiting an answer are as unavailable as
  // days already taken, so the bar has to swallow both or it will not agree
  // with the number above it.
  const spokenFor = item.usedDays + item.pendingDays;
  const fraction = entitled && total > 0 ? Math.min(1, Math.max(0, spokenFor / total)) : 0;

  const detail = entitled
    ? [
        item.pendingDays > 0 ? `${dayNumber(item.pendingDays)} pending` : null,
        `${dayNumber(item.entitledDays)} entitled`,
      ]
      .filter(Boolean)
      .join(' · ')
    : noBalanceText(item);

  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        entitled
          ? `${item.description}, ${dayText(item.availableDays)} available to book, ${dayText(item.pendingDays)} pending, ${dayText(item.entitledDays)} entitled`
          : `${item.description}, ${noBalanceText(item)}`
      }
    >
      <View style={[styles.rowIcon, { backgroundColor: leaveWash(tint) }]}>
        <MaterialCommunityIcons name={leaveIcon(item.code)} size={22} color={tint} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.description}</Text>
          {entitled ? (
            <Text style={styles.rowValue}>{dayNumber(item.availableDays)}</Text>
          ) : (
            <Text style={styles.rowDash}>–</Text>
          )}
        </View>

        <View style={styles.rowTop}>
          <Text style={styles.rowSub} numberOfLines={1}>{detail}</Text>
          {entitled ? <Text style={styles.rowValueSub}>days available</Text> : null}
        </View>

        {entitled ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: tint }]} />
          </View>
        ) : null}
      </View>

      <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
    </TouchableOpacity>
  );
};

/** Loading, failed, empty. Every one of them says something and offers a way on. */
export const LeaveState: React.FC<{
  icon: IconName;
  title: string;
  body: string;
  tone?: 'plain' | 'danger';
  onRetry?: () => void;
}> = ({ icon, title, body, tone = 'plain', onRetry }) => (
  <View style={styles.state}>
    <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
      <MaterialCommunityIcons name={icon} size={30} color={tone === 'danger' ? C.danger : C.blue} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateBody}>{body}</Text>
    {onRetry ? (
      <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryText}>Try again</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

// -- Form -------------------------------------------------------------
//
// The apply screen is the only form in this module, but its controls belong
// here for the same reason the cards do: a leave type's colour, its icon and
// the words used for "no entitlement limit" have to be identical whether you
// meet them on the overview or in the picker you choose from.

/** A white panel with a heading. The heading is dropped when the card speaks for itself. */
export const FormCard: React.FC<{
  title?: string;
  icon?: IconName;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <View style={styles.formCard}>
    {title ? (
      <View style={styles.formHead}>
        {icon ? (
          <View style={styles.formHeadIcon}>
            <MaterialCommunityIcons name={icon} size={18} color={C.blue} />
          </View>
        ) : null}
        <Text style={styles.formTitle}>{title}</Text>
      </View>
    ) : null}
    {children}
  </View>
);

export const FieldLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.fieldLabel}>{children}</Text>
);

/** A tappable field: reads like an input, opens a picker. */
export const SelectField: React.FC<{
  icon: IconName;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}> = ({ icon, value, placeholder, onPress, loading = false, disabled = false, invalid = false }) => (
  <TouchableOpacity
    style={[styles.field, invalid && styles.fieldInvalid, disabled && styles.fieldOff]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel={value || placeholder}
  >
    <MaterialCommunityIcons name={icon} size={20} color={invalid ? C.danger : C.muted} />
    <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]} numberOfLines={1}>
      {value || placeholder}
    </Text>
    {loading ? (
      <ActivityIndicator size="small" color={C.blue} />
    ) : (
      <MaterialCommunityIcons name="chevron-down" size={22} color={C.muted} />
    )}
  </TouchableOpacity>
);

/** Two or three mutually exclusive choices, e.g. which half of the day is taken. */
export const Segmented: React.FC<{
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}> = ({ options, value, onChange }) => (
  <View style={styles.segment}>
    {options.map((o) => {
      const active = o.key === value;
      return (
        <TouchableOpacity
          key={o.key}
          style={[styles.segmentItem, active && styles.segmentItemActive]}
          onPress={() => onChange(o.key)}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/**
 * A rule the leave type offers, turned on or off.
 *
 * Only rendered when the chosen type actually allows it — a switch for something
 * the type forbids is a question with one answer.
 */
export const SwitchRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}> = ({ label, value, onChange, disabled = false }) => (
  <View style={[styles.switchRow, disabled && styles.fieldOff]}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: C.line, true: '#BCD3FF' }}
      thumbColor={value ? C.blue : '#FFFFFF'}
      ios_backgroundColor={C.line}
    />
  </View>
);

/** One refusal, under the control that caused it. Renders nothing when there is none. */
export const FieldError: React.FC<{ message?: string | null }> = ({ message }) =>
  message ? (
    <View style={styles.fieldError}>
      <MaterialCommunityIcons name="alert-circle-outline" size={15} color={C.danger} />
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  ) : null;

/**
 * How long the leave comes to — the server's number, not a date subtraction.
 *
 * Weekends, public holidays and rest days come out of it according to the leave
 * type and the employee's shift, none of which the phone knows, so this waits
 * for the server rather than showing a figure that will change on submit.
 */
export const DayTally: React.FC<{
  state: 'blank' | 'busy' | 'ready';
  days?: number;
  hours?: number | null;
  excluded?: string[];
}> = ({ state, days = 0, hours = null, excluded = [] }) => (
  <View style={styles.tally}>
    <View style={styles.tallyIcon}>
      <MaterialCommunityIcons name="calendar-check-outline" size={20} color={C.blue} />
    </View>
    <View style={styles.tallyBody}>
      <Text style={styles.tallyLabel}>This leave comes to</Text>
      {state === 'busy' ? (
        <ActivityIndicator size="small" color={C.blue} style={styles.tallySpinner} />
      ) : (
        <Text style={styles.tallyValue}>
          {state === 'blank' ? '—' : hours != null ? `${dayNumber(hours)} hours` : dayText(days)}
        </Text>
      )}
      {state === 'ready' && excluded.length > 0 ? (
        <Text style={styles.tallyNote} numberOfLines={2}>
          Not counted: {excluded.map((e) => e.split(': ')[1] ?? e).join(', ')}
        </Text>
      ) : null}
    </View>
  </View>
);

/**
 * What the chosen leave type leaves the employee, in the three states the rest
 * of the app uses. Never a zero for the last two — an unpaid leave with no
 * allowance is not an exhausted one.
 *
 * On a form whose whole purpose is to ask for days, the number shown has to be
 * the number the server will measure the request against. That is available,
 * not remaining: an employee told "14 days left" who then asks for 14 and is
 * answered "you have 9" was misled by this line.
 */
export const BalanceNote: React.FC<{ item: MyLeaveEntitlement }> = ({ item }) => {
  const tint = leaveTint(item);
  const entitled = item.hasEntitlement && item.availableDays !== null;

  const words = entitled
    ? `${dayText(item.availableDays)} available to book · ${dayNumber(item.entitledDays)} entitled`
    : noBalanceText(item);

  return (
    <View style={styles.balance}>
      <View style={[styles.balanceDot, { backgroundColor: entitled ? tint : C.muted }]} />
      <Text style={styles.balanceText} numberOfLines={2}>{words}</Text>
      {entitled && item.pendingDays > 0 ? (
        <Text style={styles.balancePending}>{dayNumber(item.pendingDays)} pending</Text>
      ) : null}
    </View>
  );
};

/** One leave type in the picker: its colour, its allowance, and why it is closed to you. */
export const LeaveTypeOption: React.FC<{
  item: MyLeaveEntitlement;
  selected: boolean;
  blockedReason?: string | null;
  onPress: () => void;
  last?: boolean;
}> = ({ item, selected, blockedReason, onPress, last = false }) => {
  const tint = leaveTint(item);
  // Available, not remaining, for the same reason as the note under the field:
  // this is the list the employee chooses from, and picking a type by a number
  // they cannot actually spend just moves the refusal one screen later.
  const entitled = item.hasEntitlement && item.availableDays !== null;
  const blocked = !!blockedReason;

  return (
    <TouchableOpacity
      style={[styles.option, !last && styles.rowDivider, blocked && styles.fieldOff]}
      onPress={onPress}
      disabled={blocked}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: blocked }}
    >
      <View style={[styles.optionIcon, { backgroundColor: leaveWash(tint) }]}>
        <MaterialCommunityIcons name={leaveIcon(item.code)} size={20} color={tint} />
      </View>
      <View style={styles.optionBody}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleActive]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={styles.optionMeta} numberOfLines={1}>
          {blockedReason
            ?? (entitled
              ? `${dayText(item.availableDays)} available${item.pendingDays > 0 ? ` · ${dayNumber(item.pendingDays)} pending` : ''}`
              : noBalanceText(item))}
        </Text>
      </View>
      {selected ? <MaterialCommunityIcons name="check" size={20} color={C.blue} /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  heading: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.8 },
  headingAction: { fontSize: 13, fontWeight: '700', color: C.blue },

  yearBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  yearArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  yearArrowOff: { opacity: 0.5 },
  yearText: { fontSize: 16, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  cardMeta: { fontSize: 13, color: C.body },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  rowValue: { fontSize: 16, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  rowDash: { fontSize: 16, fontWeight: '800', color: C.muted },
  rowSub: { flex: 1, fontSize: 12, color: C.body },
  rowValueSub: { fontSize: 11, color: C.muted },

  track: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 5 },
  fill: { height: 6, borderRadius: 3 },

  state: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12 },
  stateBody: { fontSize: 13, color: C.body, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  formHeadIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center' },
  formTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.ink },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginBottom: 7, marginTop: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
  },
  fieldInvalid: { borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  fieldOff: { opacity: 0.55 },
  fieldText: { flex: 1, fontSize: 15, color: C.ink },
  fieldPlaceholder: { color: C.muted },

  segment: { flexDirection: 'row', gap: 6, backgroundColor: C.field, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.line },
  segmentItem: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: C.blue },
  segmentText: { fontSize: 13, fontWeight: '700', color: C.body },
  segmentTextActive: { color: '#FFFFFF' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  switchLabel: { flex: 1, fontSize: 14, color: C.ink },

  fieldError: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 7 },
  fieldErrorText: { flex: 1, fontSize: 12, lineHeight: 17, color: C.danger },

  tally: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16 },
  tallyIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#E6EEFF', alignItems: 'center', justifyContent: 'center' },
  tallyBody: { flex: 1 },
  tallyLabel: { fontSize: 12, color: C.body },
  tallyValue: { fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  tallySpinner: { alignSelf: 'flex-start', marginTop: 6 },
  tallyNote: { fontSize: 12, color: C.muted, marginTop: 4 },

  balance: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  balanceDot: { width: 8, height: 8, borderRadius: 4 },
  balanceText: { flex: 1, fontSize: 13, color: C.body },
  balancePending: { fontSize: 12, fontWeight: '700', color: '#B45309' },

  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  optionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  optionBody: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  optionTitleActive: { color: C.blue },
  optionMeta: { fontSize: 12, color: C.body, marginTop: 2 },
});
