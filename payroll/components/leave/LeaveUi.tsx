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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import type { DialogTone, PromptOptions } from '../ui/AppDialog';
import {
  APPROVAL_CARD,
  DecisionButtons as SharedDecisionButtons,
  type DecisionButtonsProps,
} from '../ui/ApprovalCard';
import { StatusPill, parseDate, plainDate, statusOf, type RequestStatus } from '../requests/RequestUi';
import type { LeaveApplication, MyLeaveEntitlement } from '../../api/services/leaveService';
import { serverMessage } from '../../lib/serverMessage';
import { SHORT_MONTHS, malaysianDayNumber, todayInMalaysia } from '../../lib/dates';

// ── Getting about ─────────────────────────────────────────────────────

/**
 * For the kits that are handed `navigation` loosely (claims and payslips
 * re-export this). The leave screens themselves navigate through the typed
 * stack in navigation/types.ts, so a wrong route or param there is a compile
 * error rather than a silent no-op.
 */
export function goTo(navigation: unknown, screen: string, params?: Record<string, unknown>): void {
  (navigation as { navigate: (screen: string, params?: Record<string, unknown>) => void }).navigate(screen, params);
}

// ── Status ────────────────────────────────────────────────────────────

/**
 * Which bucket a leave status is counted and filtered under.
 *
 * Withdrawn is a way of being cancelled — it is off the approver's list and
 * the days are back — so it is counted with Cancelled. The pill still says
 * "Withdrawn": the employee should read back what they did.
 */
export function leaveStatusKey(status: string | null | undefined): RequestStatus {
  return (status ?? '').toUpperCase() === 'WITHDRAWN' ? 'CANCELLED' : statusOf(status);
}

/** The shared status pill, which knows Withdrawn (Cancelled's colours, its own word). */
export const LeaveStatusPill: React.FC<{ status: string }> = ({ status }) => <StatusPill status={status} />;

// ── Deciding ──────────────────────────────────────────────────────────

/**
 * Set once the server has refused a decision because this account has no
 * employee record. Module state on purpose: it lasts for this app session, so
 * after the first refusal the screens stop offering buttons that can only fail,
 * and it resets on the next start, so the buttons come back by themselves once
 * the server accepts decisions from HR without an employee record.
 */
let phoneDecisionsRefused = false;
export const decisionsRefused = (): boolean => phoneDecisionsRefused;

/**
 * Why an approve or reject was refused, in words that fit the person reading.
 *
 * HR added straight to the company has no employee record, and the live
 * server's decision route still insists on one, answering "Please join a
 * company first" — advice that makes no sense to HR. This says where the
 * decision can be made instead, and remembers the refusal (above).
 */
export function decisionFailure(err: unknown, hasEmployeeRecord: boolean): string {
  const message = serverMessage(err, 'Please try again.');
  if (!hasEmployeeRecord && /employee record|join a company/i.test(message)) {
    phoneDecisionsRefused = true;
    return 'This account can’t approve leave on the phone yet. Please decide it on the web: Leave > Applications.';
  }
  return message;
}

/**
 * The one reject prompt, so the list and the details page ask the same thing
 * with the same limit. The reason is required: a rejection the employee cannot
 * explain to their manager is worthless.
 */
export function rejectPrompt(dialog: { prompt: (options: PromptOptions) => Promise<string | null> }): Promise<string | null> {
  return dialog.prompt({
    title: 'Reject this leave',
    message: 'The employee will see your reason.',
    placeholder: 'Reason for rejecting',
    confirmText: 'Reject',
    required: true,
    multiline: true,
    maxLength: 1000,
    destructive: true,
  });
}

/**
 * The approve confirmation: the facts, nothing promised. Whether approving
 * finishes the leave or passes it on depends on the server version, so the
 * outcome is told afterwards from the server's answer (decisionOutcome).
 */
export function approveConfirmText(leave: LeaveApplication, waitingOnSomeoneElse?: string | null): string {
  const facts = `${leave.employeeName || 'Employee'}: ${leave.leaveTypeDescription || 'Leave'}, ${dateRangeText(leave.startDate, leave.endDate)} (${leaveLength(leave)}).`;
  return waitingOnSomeoneElse ? `${facts} Waiting on ${waitingOnSomeoneElse}.` : facts;
}

/** What a decision did, worded from the leave the server sent back. */
export function decisionOutcome(kind: 'approve' | 'reject', name: string, result: LeaveApplication | undefined): string {
  if (kind === 'reject') return `Rejected – ${name}`;
  const status = (result?.status ?? '').toUpperCase();
  if (status === 'APPROVED') return `Approved – ${name}`;
  if (status === 'PENDING') {
    const step = result?.currentApprovalStep;
    const next = result?.approvals?.find((a) => a.stepOrder === step && (a.status ?? '').toUpperCase() === 'PENDING');
    const who = (next?.approverName || result?.currentApproverName || '').trim();
    return `Step approved – now with ${who || 'the next approver'}`;
  }
  return `Done – ${name}`;
}

/**
 * The shared dialog's toast. Still looked up rather than assumed, so a caller
 * handed some other object falls back to its own feedback instead of throwing.
 */
export function trySharedToast(dialog: unknown, message: string): boolean {
  const shared = dialog as { toast?: (message: string, tone?: DialogTone) => void } | null;
  if (!shared || typeof shared.toast !== 'function') return false;
  shared.toast(message, 'success');
  return true;
}

/**
 * Feedback after a decision that does not need a tap to clear.
 *
 * Uses the shared dialog's toast when it has one; until then a pill drawn by
 * the screen itself. Returned as a node so the screen places it above its own
 * bottom bar.
 */
export function useLeaveToast(dialog: unknown, bottom: number): { node: React.ReactNode; show: (message: string) => void } {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = useCallback((text: string) => {
    if (trySharedToast(dialog, text)) return;
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 2500);
  }, [dialog]);

  const node = message ? (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom }]}>
      <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <MaterialCommunityIcons name="check-circle-outline" size={18} color="#16A34A" />
        <Text style={styles.toastText} numberOfLines={2}>{message}</Text>
      </View>
    </View>
  ) : null;

  return { node, show };
}

/**
 * A confirmation carried from the details page back to the approval list.
 *
 * The details page goes back the moment a decision lands, so its own toast
 * would vanish with it; the list picks this up on focus and shows it there.
 * Short-lived, so a confirmation never surfaces on a later, unrelated visit.
 */
let handedOff: { message: string; at: number } | null = null;
export function handOffNotice(message: string): void {
  handedOff = { message, at: Date.now() };
}
export function takeHandedOffNotice(): string | null {
  const notice = handedOff;
  handedOff = null;
  return notice && Date.now() - notice.at < 5000 ? notice.message : null;
}

/**
 * Reject and Approve, the undo button and the initials now live in ui/ApprovalCard, shared with
 * Request and Claim Approval so the three lists cannot drift apart again. Re-exported here so
 * the leave screens keep their imports; the leave's own buttons say "leave" to a screen reader.
 */
export { DangerOutlineButton, personInitials } from '../ui/ApprovalCard';

export const DecisionButtons: React.FC<Omit<DecisionButtonsProps, 'subject'>> = (props) => (
  <SharedDecisionButtons {...props} subject="leave" />
);

// ── Malaysian calendar ────────────────────────────────────────────────

/** Today in Malaysia as YYYY-MM-DD, whatever zone the phone is set to. Malaysia has no DST. */
export { todayInMalaysia };

/** Whole Malaysian days since a server timestamp; null when it cannot be read. */
export function daysSince(iso: string | null | undefined): number | null {
  const d = parseDate(iso);
  if (!d) return null;
  return Math.max(0, malaysianDayNumber(Date.now()) - malaysianDayNumber(d.getTime()));
}

/**
 * Whether a leave still waiting for an answer has already reached its dates —
 * the urgency an approver triages on, which the applied date does not show.
 */
export function startNote(leave: { startDate: string | null; endDate: string | null }): string | null {
  const start = ymd(leave.startDate);
  if (!start) return null;
  const today = todayInMalaysia();
  const startKey = (leave.startDate ?? '').slice(0, 10);
  const endKey = (leave.endDate ?? '').slice(0, 10) || startKey;
  if (startKey > today) return null;
  if (endKey < today) return 'Dates passed';
  if (startKey === today) return 'Starts today';
  return `Started ${start.d} ${SHORT_MONTHS[start.m - 1]}`;
}

/** "3 days", or "2 hours" for leave taken by the hour — a 2-hour leave is not "0.3 days". */
export function leaveLength(leave: { totalDays: number; totalHours?: number | null }): string {
  if (typeof leave.totalHours === 'number' && leave.totalHours > 0) {
    return `${dayNumber(leave.totalHours)} ${leave.totalHours === 1 ? 'hour' : 'hours'}`;
  }
  return dayText(leave.totalDays);
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

/**
 * The top bar every leave screen shares: back, a title, and one short line
 * under it when there is something worth saying.
 *
 * One component because six screens each carried their own copy at 22pt with
 * 8 + 12 of padding, and the owner's phones lost a card's worth of height to
 * it on every page. The empty box on the right is the back button's width, so
 * the title sits in the true centre and a long one ellipsises instead of
 * running under the arrow.
 */
export const LeaveHeader: React.FC<{
  title: string;
  subtitle?: string | null;
  onBack: () => void;
}> = ({ title, subtitle, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.headerBack}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
    </TouchableOpacity>
    <View style={styles.headerText}>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    <View style={styles.headerSide} />
  </View>
);

export const SectionHeading: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** A control that belongs to this section, e.g. the year it is showing. */
  right?: React.ReactNode;
}> = ({ title, actionLabel, onAction, right }) => (
  <View style={styles.headingRow}>
    <Text style={styles.heading}>{title}</Text>
    {right ?? (actionLabel && onAction ? (
      <TouchableOpacity
        onPress={onAction}
        style={styles.headingActionHit}
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.headingAction}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null)}
  </View>
);

/**
 * Back a year, forward as far as the caller allows.
 *
 * Leave passes next year as the limit, because leave is booked ahead: in
 * October a January booking is already real, and a bar that stopped at this
 * year hid it from every list. `compact` drops the white bar so it can sit
 * inside a heading or a card instead of costing a row of its own. `busy` holds
 * the arrows while a year is loading, so a second tap cannot race the first.
 */
export const YearBar: React.FC<{
  year: number;
  maxYear: number;
  minYear?: number;
  onChange: (year: number) => void;
  compact?: boolean;
  busy?: boolean;
}> = ({ year, maxYear, minYear = 2000, onChange, compact = false, busy = false }) => {
  const canBack = year > minYear && !busy;
  const canForward = year < maxYear && !busy;

  return (
    <View style={compact ? styles.yearInline : styles.yearBar}>
      <TouchableOpacity
        onPress={() => canBack && onChange(year - 1)}
        disabled={!canBack}
        style={[styles.yearArrow, !canBack && styles.yearArrowOff]}
        accessibilityRole="button"
        accessibilityLabel={`Show ${year - 1}`}
      >
        <MaterialCommunityIcons name="chevron-left" size={compact ? 22 : 24} color={canBack ? C.ink : C.muted} />
      </TouchableOpacity>
      <View style={styles.yearMiddle}>
        {busy ? (
          <ActivityIndicator size="small" color={C.blue} />
        ) : (
          <Text style={[styles.yearText, compact && styles.yearTextCompact]}>{year}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => canForward && onChange(year + 1)}
        disabled={!canForward}
        style={[styles.yearArrow, !canForward && styles.yearArrowOff]}
        accessibilityRole="button"
        accessibilityLabel={`Show ${year + 1}`}
      >
        <MaterialCommunityIcons name="chevron-right" size={compact ? 22 : 24} color={canForward ? C.ink : C.muted} />
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
  const dates = dateRangeText(leave.startDate, leave.endDate);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.cardIcon, { backgroundColor: leaveWash(tint) }]}>
        <MaterialCommunityIcons name={leaveIcon(leave.leaveTypeCode)} size={20} color={tint} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {showType ? leave.leaveTypeDescription || 'Leave' : dates}
          </Text>
          <LeaveStatusPill status={leave.status} />
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {showType ? `${dates} · ${leaveLength(leave)}` : leaveLength(leave)}
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
        <MaterialCommunityIcons name={leaveIcon(item.code)} size={20} color={tint} />
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

/**
 * Loading, failed, empty. Every one of them says something and offers a way on.
 * `actionLabel` renames the button for a state whose way on is not a retry,
 * such as sending HR without an employee record to the approval queue.
 */
export const LeaveState: React.FC<{
  icon: IconName;
  title: string;
  body: string;
  tone?: 'plain' | 'danger';
  onRetry?: () => void;
  actionLabel?: string;
  /** Centre it in the space it is given, e.g. an empty list, instead of sitting at the top. */
  fill?: boolean;
}> = ({ icon, title, body, tone = 'plain', onRetry, actionLabel = 'Try again', fill = false }) => (
  <View style={[styles.state, fill && styles.stateFill]}>
    <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
      <MaterialCommunityIcons name={icon} size={28} color={tone === 'danger' ? C.danger : C.blue} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateBody}>{body}</Text>
    {onRetry ? (
      <TouchableOpacity style={styles.retry} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryText}>{actionLabel}</Text>
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

/**
 * The white card of the HR design language: radius 16, a 1px line border and a
 * neutral shadow. Exported so the approval list's cards are the same surface
 * as every panel on the leave pages.
 */
export const LEAVE_CARD = APPROVAL_CARD;

/**
 * A white panel with a plain heading. The heading is dropped when the card
 * speaks for itself. `icon` is accepted for the existing call sites but no
 * longer drawn: a blue tile on every section put brand blue on things that
 * are not actions, which the brief keeps for buttons and the active tab.
 */
export const FormCard: React.FC<{
  title?: string;
  icon?: IconName;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <View style={styles.formCard}>
    {title ? (
      <View style={styles.formHead}>
        <Text style={styles.formTitle}>{title}</Text>
      </View>
    ) : null}
    {children}
  </View>
);

export const FieldLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.fieldLabel}>{children}</Text>
);

/**
 * A tappable field: reads like an input, opens a picker.
 *
 * `compact` is for two fields side by side (first and last day, from and to):
 * it drops the chevron and tightens the gaps, because at half the width of a
 * 360dp Android phone "28 Sep 2026" otherwise ellipsises to "28 Se…".
 */
export const SelectField: React.FC<{
  icon: IconName;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  compact?: boolean;
  /** What the field is, for a screen reader, when the visible label sits outside it. */
  label?: string;
}> = ({ icon, value, placeholder, onPress, loading = false, disabled = false, invalid = false, compact = false, label }) => (
  <TouchableOpacity
    style={[styles.field, compact && styles.fieldCompact, invalid && styles.fieldInvalid, disabled && styles.fieldOff]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel={label ? `${label}, ${value || placeholder}` : value || placeholder}
  >
    <MaterialCommunityIcons name={icon} size={compact ? 18 : 20} color={invalid ? C.danger : C.muted} />
    <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]} numberOfLines={1}>
      {value || placeholder}
    </Text>
    {loading ? (
      <ActivityIndicator size="small" color={C.blue} />
    ) : compact ? null : (
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
 *
 * One line at the foot of the dates card rather than a card of its own: it is
 * the answer to the dates above it, and a separate card cost the form the
 * height that pushed Apply off the screen.
 */
export const DayTally: React.FC<{
  state: 'blank' | 'busy' | 'ready';
  days?: number;
  hours?: number | null;
  excluded?: string[];
}> = ({ state, days = 0, hours = null, excluded = [] }) => (
  <View style={styles.tally}>
    <MaterialCommunityIcons name="calendar-check-outline" size={18} color={C.blue} />
    <Text style={styles.tallyLabel}>Comes to</Text>
    {state === 'busy' ? (
      <ActivityIndicator size="small" color={C.blue} />
    ) : (
      <Text style={styles.tallyValue}>
        {state === 'blank' ? '—' : hours != null ? `${dayNumber(hours)} ${hours === 1 ? 'hour' : 'hours'}` : dayText(days)}
      </Text>
    )}
    {state === 'ready' && excluded.length > 0 ? (
      <Text style={styles.tallyNote} numberOfLines={1}>
        · not counted: {excluded.map((e) => e.split(': ')[1] ?? e).join(', ')}
      </Text>
    ) : null}
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
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 8 },
  headerBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.muted, marginTop: 1 },
  headerSide: { width: 44 },

  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, marginBottom: 6 },
  heading: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.8 },
  headingActionHit: { paddingVertical: 6, paddingLeft: 8 },
  headingAction: { fontSize: 13, fontWeight: '700', color: C.blue },

  yearBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  yearInline: { flexDirection: 'row', alignItems: 'center' },
  yearArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  yearArrowOff: { opacity: 0.4 },
  yearMiddle: { minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  yearText: { fontSize: 16, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  yearTextCompact: { fontSize: 15 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  cardMeta: { fontSize: 13, color: C.body },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  rowValue: { fontSize: 16, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  rowDash: { fontSize: 16, fontWeight: '800', color: C.muted },
  rowSub: { flex: 1, fontSize: 12, color: C.body },
  rowValueSub: { fontSize: 11, color: C.muted },

  track: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 5 },
  fill: { height: 6, borderRadius: 3 },

  state: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 },
  stateFill: { flex: 1, justifyContent: 'center' },
  stateIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 10, textAlign: 'center' },
  stateBody: { fontSize: 13, color: C.body, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  retry: { marginTop: 14, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  formCard: { ...LEAVE_CARD, padding: 14 },
  formHead: { marginBottom: 8 },
  formTitle: { fontSize: 13, fontWeight: '600', color: C.body },

  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  toastText: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: C.ink },


  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginBottom: 6, marginTop: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
  },
  fieldCompact: { gap: 8, paddingHorizontal: 12 },
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

  tally: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tallyLabel: { fontSize: 13, color: C.body },
  tallyValue: { fontSize: 15, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  tallyNote: { flex: 1, fontSize: 12, color: C.muted },

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
