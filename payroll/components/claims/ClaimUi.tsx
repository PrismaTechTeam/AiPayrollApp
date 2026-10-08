/**
 * The pieces the five claim screens share.
 *
 * One place, so that an amount is written the same way whether the employee is
 * typing it, reading it back, or an approver is deciding on it. Money is the
 * whole subject of this module and the old screens disagreed with themselves
 * about it — the same claim read "$40.00" on the detail page and "RM 40.00" on
 * the form above it.
 *
 * Status is deliberately not re-invented here: a claim moves through the same
 * five states as a request, so it borrows that pill rather than growing a second
 * set of colours for the same words.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import { StatusPill, parseDate, statusOf } from '../requests/RequestUi';
import { APPROVAL_CARD, ApprovalPerson, DecisionButtons } from '../ui/ApprovalCard';
// Payroll runs on Malaysia time (UTC+8, no daylight saving), wherever the phone is.
import { MYT_OFFSET_MS, SHORT_MONTHS } from '../../lib/dates';
import { formatBytes, type PickedFile } from '../../lib/requestAttachments';
import type { ClaimApplication, ClaimBalance, ClaimType } from '../../api/services/claimService';

export { StatusPill, statusOf, plainDate, parseDate } from '../requests/RequestUi';
export { goTo } from '../leave/LeaveUi';

// ── Dates ─────────────────────────────────────────────────────────────────

/**
 * Month names written out here rather than asked of the phone. toLocaleDateString
 * printed "Sep 14, 2026" on an en-US phone and "14 Sept 2026" on a newer en-GB
 * ICU, so the same claim read three ways across three handsets.
 */
const MONTHS = SHORT_MONTHS;

/** A server timestamp shifted to Malaysia time; read it with the getUTC* methods. */
function inMyt(iso: string | null | undefined): Date | null {
  const d = parseDate(iso);
  return d ? new Date(d.getTime() + MYT_OFFSET_MS) : null;
}

/** "14 Sep 2026", in Malaysia time. */
export function shortDate(iso: string | null | undefined): string {
  const d = inMyt(iso);
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : '—';
}

/** "14 Sep 2026, 3:05 PM", in Malaysia time: an approval stamped at 9am in KL reads 9am on every phone. */
export function dateAndTime(iso: string | null | undefined): string {
  const d = inMyt(iso);
  if (!d) return '';
  const h = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${shortDate(iso)}, ${h % 12 || 12}:${minutes} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "4 Sep" this year, "4 Sep 2025" otherwise: short enough for a card's last line. */
export function dayMonth(iso: string | null | undefined): string {
  const d = inMyt(iso);
  if (!d) return '—';
  const thisYear = new Date(Date.now() + MYT_OFFSET_MS).getUTCFullYear();
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return d.getUTCFullYear() === thisYear ? base : `${base} ${d.getUTCFullYear()}`;
}

/** Whole Malaysian calendar days since a timestamp; 0 for today, null when there is none. */
export function daysSince(iso: string | null | undefined): number | null {
  const d = inMyt(iso);
  if (!d) return null;
  const now = new Date(Date.now() + MYT_OFFSET_MS);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((today - start) / 86400000));
}

/** "waiting 34 days", said so that a claim sent this morning does not read "waiting 0 days". */
export function waitingText(iso: string | null | undefined): string | null {
  const n = daysSince(iso);
  if (n === null) return null;
  if (n === 0) return 'new today';
  return `waiting ${n} ${n === 1 ? 'day' : 'days'}`;
}

/** Two letters for the avatar disc: the first of the first two words of the name. */
export function initials(name?: string | null): string {
  if (!name) return '?';
  const letters = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return letters || '?';
}

// ── Money ─────────────────────────────────────────────────────────────────

/**
 * "RM 1,240.50". Always two decimals, always grouped, always the same prefix.
 *
 * en-MY rather than the device locale: the amount was entered against a
 * Malaysian payroll and re-grouping it by wherever the phone happens to be set
 * would print a different number for the same claim.
 */
export function money(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * What the person typed, as a number, or null when it is not one.
 *
 * The amount box opens the decimal pad, and on a phone set to Bahasa Indonesia
 * or Vietnamese that pad's decimal key is a comma. Stripping every comma read
 * "42,50" as 4250 -- a RM 42.50 taxi sent as RM 4,250.00, silently when the type
 * has no limit. So a lone comma with one or two digits after it is the decimal
 * point; any other comma has to be a real thousands separator or the text is
 * refused rather than guessed at.
 */
export function parseAmount(text: string): number | null {
  let cleaned = text.trim();
  if (cleaned === '') return null;
  if (cleaned.includes(',')) {
    if (!cleaned.includes('.') && /^\d*,\d{1,2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else if (/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      return null;
    }
  }
  // Sen is the smallest thing payroll pays out; a third decimal is a slip, not a price.
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ── Allowance ─────────────────────────────────────────────────────────────

/** One budget on a claim type: this month's or this year's. */
export interface Allowance {
  period: 'month' | 'year';
  limit: number;
  used: number;
  remaining: number;
}

/**
 * The month's or the year's budget for a type, or null when HR set none.
 *
 * `credit` hands back money the balance counts but should not: the server adds
 * every pending claim into "used", the one being edited included, so changing
 * only the description of an RM 80 claim against an RM 100 limit warned
 * "RM 20.00 left, this claim is RM 80.00". Worked from claimed + pending rather
 * than from the server's remainder, which is floored at zero and so cannot have
 * anything added back to it.
 */
export function allowance(balance: ClaimBalance, period: 'month' | 'year', credit = 0): Allowance | null {
  const limit = period === 'month' ? balance.monthlyLimit : balance.yearlyLimit;
  if (!(limit > 0)) return null;
  const counted = period === 'month'
    ? balance.mtdClaimed + balance.mtdPending
    : balance.ytdClaimed + balance.ytdPending;
  const used = Math.max(0, counted - credit);
  return { period, limit, used, remaining: Math.max(0, limit - used) };
}

/**
 * Whichever budget runs out first. A type with both limits used to read
 * "RM 1,000.00 left" on My Claims (the year) and "RM 0.00 left this month" on
 * the form, for the same person on the same day.
 */
export function tighterAllowance(...options: (Allowance | null)[]): Allowance | null {
  return options.reduce<Allowance | null>((best, next) => {
    if (!next) return best;
    if (!best) return next;
    return next.remaining < best.remaining ? next : best;
  }, null);
}

export function allowancePeriod(a: Allowance): string {
  return a.period === 'month' ? 'this month' : 'this year';
}

// ── Look ──────────────────────────────────────────────────────────────────

/**
 * Colours to fall back on, picked from a key so a claim type keeps the same
 * colour rather than shuffling every render.
 *
 * The key must be the claim type's id. Its name is not the same string on every
 * screen -- the balance endpoint sends the short code where the type list sends
 * the description -- so keying on the name gave one type three colours across
 * three screens.
 */
const FALLBACK_TINTS = ['#2F6BFF', '#7C3AED', '#0EA5E9', '#16A34A', '#EA580C', '#DB2777', '#0891B2'];

export function claimTint(claimTypeId: string | null | undefined): string {
  const key = claimTypeId ?? '';
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return FALLBACK_TINTS[sum % FALLBACK_TINTS.length];
}

/** A soft wash of the tint for the icon disc, at a fixed alpha so every row matches. */
export function claimWash(tint: string): string {
  return `${tint}1A`;
}

/**
 * Claim types are free text per tenant, so there is no code list to switch on.
 * Matching on words gives a medical claim a medical icon in most companies and
 * a neutral receipt in the rest, which is the right way round to be wrong.
 */
const ICON_WORDS: [RegExp, IconName][] = [
  [/medic|health|clinic|dental|optic|hospital/i, 'medical-bag'],
  [/travel|flight|air|hotel|lodg|accommod/i, 'airplane'],
  [/mileage|petrol|fuel|toll|park|car|transport|taxi|grab/i, 'car'],
  [/meal|food|lunch|dinner|entertain/i, 'silverware-fork-knife'],
  [/phone|mobile|internet|data|telco/i, 'cellphone'],
  [/train|course|educat|study|book|exam/i, 'school-outline'],
  [/uniform|cloth|equip|tool|stationer/i, 'toolbox-outline'],
];

export function claimIcon(type: { code?: string | null; name?: string | null }): IconName {
  const text = `${type.code ?? ''} ${type.name ?? ''}`;
  for (const [pattern, icon] of ICON_WORDS) {
    if (pattern.test(text)) return icon;
  }
  return 'receipt';
}

// ── Receipts ──────────────────────────────────────────────────────────────

/** Matches the extensions MobileClaimController accepts on a receipt upload. */
export const RECEIPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'] as const;

/** Matches the 10MB ceiling the same action enforces. */
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export const RECEIPT_LABEL = 'A photo or a PDF';

/**
 * Why a picked receipt cannot be sent, or null when it can. The server checks
 * all of this again; this is only so the person finds out before uploading.
 */
export function receiptRejectionReason(file: PickedFile): string | null {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ext) return 'That file has no extension, so we cannot tell what it is.';
  if (!RECEIPT_EXTENSIONS.includes(ext as (typeof RECEIPT_EXTENSIONS)[number])) {
    return `${ext} files cannot be attached to a claim. Attach a JPG, PNG or PDF.`;
  }
  if (file.size != null && file.size === 0) return 'That file is empty.';
  if (file.size != null && file.size > RECEIPT_MAX_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(RECEIPT_MAX_BYTES)}.`;
  }
  return null;
}

function receiptIcon(fileName: string): IconName {
  return /\.pdf$/i.test(fileName) ? 'file-pdf-box' : 'file-image-outline';
}

/**
 * The attached receipt. Without `onOpen` it is a plain statement of what is
 * there — a file chosen on the form has not been uploaded yet, and a row that
 * looks tappable but does nothing reads as a bug.
 *
 * `thumbUri` puts a small picture of a just-taken photo where the icon goes. It
 * replaced a 170pt preview that pushed the Send button off the screen; a thumb
 * is enough to see that the right receipt went in.
 */
export const ReceiptRow: React.FC<{
  fileName: string;
  onOpen?: () => void | Promise<void>;
  onRemove?: () => void;
  hint?: string;
  thumbUri?: string;
  /** The mark on the right of a tappable row: a download by default, an eye where tapping shows the picture. */
  actionIcon?: IconName;
}> = ({ fileName, onOpen, onRemove, hint, thumbUri, actionIcon = 'tray-arrow-down' }) => {
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (busy || !onOpen) return;
    setBusy(true);
    try {
      await onOpen();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.fileRow}>
      <TouchableOpacity
        style={styles.fileMain}
        onPress={open}
        disabled={!onOpen}
        activeOpacity={0.7}
        accessibilityRole={onOpen ? 'button' : undefined}
      >
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.fileThumb} resizeMode="cover" />
        ) : (
          <View style={styles.fileIcon}>
            <MaterialCommunityIcons name={receiptIcon(fileName)} size={22} color={C.body} />
          </View>
        )}
        <View style={styles.fileText}>
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.fileMeta} numberOfLines={1}>{hint ?? 'Tap to open'}</Text>
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={C.blue} />
        ) : onOpen ? (
          <MaterialCommunityIcons name={actionIcon} size={20} color={C.muted} />
        ) : null}
      </TouchableOpacity>
      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.fileRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${fileName}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="close" size={18} color={C.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

/** The dashed "attach a receipt" target, with the rules written under it. */
export const ReceiptButton: React.FC<{
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  label?: string;
}> = ({ onPress, busy = false, disabled = false, label = 'Attach a receipt' }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={busy || disabled}
    activeOpacity={0.7}
    style={[styles.attach, (busy || disabled) && styles.attachDisabled]}
    accessibilityRole="button"
  >
    {busy ? (
      <ActivityIndicator size="small" color={C.blue} />
    ) : (
      <MaterialCommunityIcons name="camera-outline" size={20} color={C.blue} />
    )}
    <View style={styles.fileText}>
      <Text style={styles.attachTitle}>{busy ? 'Uploading…' : label}</Text>
      <Text style={styles.fileMeta}>{RECEIPT_LABEL}, up to {formatBytes(RECEIPT_MAX_BYTES)}</Text>
    </View>
  </TouchableOpacity>
);

// ── Rows and cards ────────────────────────────────────────────────────────

/**
 * One of the employee's own claims in a list: what it was for, how much, and
 * where it stands. The approver's list has its own card, ClaimApprovalCard.
 */
export const ClaimCard: React.FC<{
  claim: ClaimApplication;
  onPress?: () => void;
}> = ({ claim, onPress }) => {
  const title = claim.claimTypeName ?? 'Claim';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${money(claim.amount)}, ${claim.status.toLowerCase()}`}
    >
      {/* A neutral disc with a line icon. The per-type pastel washes made every
          list a rainbow, which is the tile look the owner has turned down. */}
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name={claimIcon({ name: claim.claimTypeName })} size={22} color={C.body} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.cardAmount} numberOfLines={1}>{money(claim.amount)}</Text>
        </View>

        <View style={styles.cardTop}>
          <Text style={styles.cardMeta} numberOfLines={1}>{claimDate(claim.transDate)}</Text>
          <StatusPill status={claim.status} />
        </View>

        {claim.attachmentFileName || claim.receiptNo ? (
          <View style={styles.badgeRow}>
            {claim.attachmentFileName ? (
              <View style={styles.badge}>
                <MaterialCommunityIcons name="paperclip" size={13} color={C.body} />
                <Text style={styles.badgeText}>Receipt</Text>
              </View>
            ) : null}
            {claim.receiptNo ? (
              <View style={styles.badge}>
                <MaterialCommunityIcons name="pound" size={13} color={C.body} />
                <Text style={styles.badgeText} numberOfLines={1}>{claim.receiptNo}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

/**
 * One claim in the approver's list. The same card Leave and Request Approval
 * use, so the three HR lists read alike: who, what, how much and when, the
 * reason, how long it has waited, then the two decisions.
 *
 * Separate from ClaimCard, which is the employee's own list and has no person
 * to show. The approval queue used to borrow that card and bolt a button row on
 * below it: a type icon where the person should be, no employee code, the spend
 * date cut off behind a long type name, and no description, so every claim had
 * to be opened just to see what it was for.
 */
export const ClaimApprovalCard: React.FC<{
  claim: ClaimApplication;
  onPress: () => void;
  /** Off on the Pending tab, where every card would say the same "Pending". */
  showStatus?: boolean;
  /** The viewer's own claim: someone else decides it, so there are no buttons. */
  own?: boolean;
  /** Approve and Reject; left out when the claim is not this viewer's to decide. */
  onApprove?: () => void;
  onReject?: () => void;
  /** Which decision is being sent, so the spinner sits in the button that was pressed. */
  busy?: 'approve' | 'reject' | null;
  /** Another card's decision is in flight. */
  disabled?: boolean;
}> = ({ claim, onPress, showStatus = false, own = false, onApprove, onReject, busy = null, disabled = false }) => {
  const type = claim.claimTypeName ?? 'Claim';
  const name = claim.employeeName ?? 'Employee';
  const state = statusOf(claim.status);
  const pending = state === 'PENDING';
  const decidable = pending && !own && !!onApprove && !!onReject;

  // One muted line in place of the second "Waiting" chip Leave Approval grew:
  // when it came in, how long it has sat (or when it was decided), and whether
  // there is a receipt to look at.
  const meta: string[] = [`Applied ${dayMonth(claim.createdAt)}`];
  if (pending) {
    const waiting = waitingText(claim.createdAt);
    if (waiting) meta.push(waiting);
  } else if (claim.approvedAt && (state === 'APPROVED' || state === 'REJECTED')) {
    meta.push(`${state === 'APPROVED' ? 'approved' : 'rejected'} ${dayMonth(claim.approvedAt)}`);
  }
  meta.push(claim.attachmentFileName ? 'Receipt attached' : 'No receipt');

  // The card body and the buttons are siblings, not nested: inside one touchable a screen
  // reader heard the card as one element and could not reach Approve or Reject.
  return (
    <View style={styles.approvalCard}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${type}, ${money(claim.amount)}, spent ${claimDate(claim.transDate)}`}
      >
        <ApprovalPerson
          name={name}
          code={claim.employeeCode}
          own={own}
          right={showStatus ? <StatusPill status={claim.status} /> : null}
        />

        <View style={styles.typeRow}>
          <View style={[styles.typeDot, { backgroundColor: claimTint(claim.claimTypeId) }]} />
          <Text style={styles.typeText} numberOfLines={2}>{type}</Text>
        </View>

        {/* Never truncated: a long amount and date wrap onto a second line rather
            than lose the year, which is the bug Leave Approval shipped with. */}
        <Text style={styles.amountLine}>
          <Text style={styles.amountText}>{money(claim.amount)}</Text>
          <Text style={styles.amountMeta}>{`  ·  Spent ${claimDate(claim.transDate)}`}</Text>
        </Text>

        {claim.description ? (
          <Text style={styles.reasonLine} numberOfLines={2}>{claim.description}</Text>
        ) : null}

        <Text style={styles.metaLine}>{meta.join(' · ')}</Text>

        {pending && own ? (
          <Text style={styles.metaLine}>Your own claim. Another approver decides it.</Text>
        ) : null}
      </TouchableOpacity>

      {decidable ? (
        <View style={styles.decisionRow}>
          <DecisionButtons
            onReject={onReject}
            onApprove={onApprove}
            acting={busy}
            disabled={disabled}
            name={name}
            subject="claim"
          />
        </View>
      ) : null}
    </View>
  );
};

/**
 * A transaction date arrives as a full timestamp but means a calendar day, so it
 * is read off the string rather than through a Date that a zone could shift.
 */
export function claimDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return '—';
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : '—';
}

/**
 * One claim type's allowance.
 *
 * Two shapes, one row, for the same reason leave has two: a type with no limit
 * set has nothing to count down, and printing "RM 0.00 left" for it would tell
 * the employee they cannot claim, which is false.
 *
 * A type with both a monthly and a yearly limit shows whichever runs out first,
 * and says which, so this row and the form's "left this month" agree.
 */
export const BalanceRow: React.FC<{
  balance: ClaimBalance;
  last?: boolean;
  onPress?: () => void;
}> = ({ balance, last = false, onPress }) => {
  const tint = claimTint(balance.claimTypeId);
  const binding = tighterAllowance(allowance(balance, 'month'), allowance(balance, 'year'));
  const fraction = binding ? Math.min(1, Math.max(0, binding.used / binding.limit)) : 0;

  const Row = onPress ? TouchableOpacity : View;

  return (
    <Row
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        binding
          ? `${balance.claimTypeName}, ${money(binding.remaining)} left ${allowancePeriod(binding)} of ${money(binding.limit)}`
          : `${balance.claimTypeName}, no limit set`
      }
    >
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={claimIcon({ name: balance.claimTypeName })} size={18} color={C.body} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{balance.claimTypeName}</Text>
          <Text style={binding ? styles.rowValue : styles.rowDash} numberOfLines={1}>
            {binding ? money(binding.remaining) : '–'}
          </Text>
        </View>

        <View style={styles.rowTop}>
          <Text style={styles.rowSub} numberOfLines={1}>
            {binding ? `${binding.period === 'month' ? 'Monthly' : 'Yearly'} limit ${money(binding.limit)}` : 'No limit set'}
          </Text>
          {binding ? <Text style={styles.rowValueSub}>left {allowancePeriod(binding)}</Text> : null}
        </View>

        {binding ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: tint }]} />
          </View>
        ) : null}
      </View>
    </Row>
  );
};

/**
 * One claim type, read-only: what it is called and what it allows.
 *
 * `balance` is this employee's own allowance for the type, when there is one.
 * HR can give a person a limit of their own, and the type's default printed
 * beside it disagreed with what My Claims said that same person had.
 */
export const ClaimTypeRow: React.FC<{ type: ClaimType; balance?: ClaimBalance | null; last?: boolean }> = ({
  type,
  balance = null,
  last = false,
}) => {
  const yearly = balance ? balance.yearlyLimit : type.yearlyLimit;
  const monthly = balance ? balance.monthlyLimit : type.monthlyLimit;
  const limits: string[] = [];
  if (yearly != null && yearly > 0) limits.push(`${money(yearly)} a year`);
  if (monthly != null && monthly > 0) limits.push(`${money(monthly)} a month`);
  // The name falls back to the code when HR left the description blank; the
  // code beside it then printed the same word twice.
  const showCode = Boolean(type.code) && type.code !== type.name;

  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={claimIcon(type)} size={18} color={C.body} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{type.name}</Text>
          {showCode ? <Text style={styles.rowCode}>{type.code}</Text> : null}
        </View>
        <Text style={styles.rowSub} numberOfLines={2}>
          {limits.length > 0 ? limits.join(' · ') : 'No limit set'}
        </Text>
        {type.requireReceipt || type.taxable ? (
          <View style={styles.badgeRow}>
            {type.requireReceipt ? (
              <View style={styles.badge}>
                <MaterialCommunityIcons name="paperclip" size={13} color={C.body} />
                <Text style={styles.badgeText}>Receipt required</Text>
              </View>
            ) : null}
            {type.taxable ? (
              <View style={styles.badge}>
                <MaterialCommunityIcons name="cash" size={13} color={C.body} />
                <Text style={styles.badgeText}>Taxable</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ── States and furniture ──────────────────────────────────────────────────

/**
 * Loading, failed, empty, locked. Every one says something and offers a way on.
 * `body` is optional: an empty list says enough with its title, and a sentence
 * under it explaining the obvious is the filler the owner strikes out.
 */
export const ClaimState: React.FC<{
  icon: IconName;
  title: string;
  body?: string;
  tone?: 'plain' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, body, tone = 'plain', actionLabel, onAction }) => (
  <View style={styles.state}>
    <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
      <MaterialCommunityIcons name={icon} size={30} color={tone === 'danger' ? C.danger : C.muted} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    {body ? <Text style={styles.stateBody}>{body}</Text> : null}
    {actionLabel && onAction ? (
      <TouchableOpacity style={styles.retry} onPress={onAction} accessibilityRole="button">
        <Text style={styles.retryText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export const SectionHeading: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, actionLabel, onAction }) => (
  <View style={styles.headingRow}>
    <Text style={styles.heading}>{title}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity onPress={onAction} accessibilityRole="button" hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}>
        <Text style={styles.headingAction}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export interface StatusFilter {
  key: string;
  label: string;
}

export const CLAIM_FILTERS: StatusFilter[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  // "Cancelled", not "Withdrawn": withdrawing is the verb, and the pill this
  // module shares with requests writes the resulting state as Cancelled.
  { key: 'CANCELLED', label: 'Cancelled' },
];

/**
 * The status strip. Counts are shown only where there is something to count.
 *
 * One row that scrolls sideways: five chips with counts do not fit a 390pt
 * phone, and wrapping them onto a second line pushed the first claim down by a
 * row. `inset` is the list's side padding, so the strip runs to the screen edge
 * instead of being clipped a gutter short of it.
 */
export const FilterChips: React.FC<{
  filters: StatusFilter[];
  active: string;
  counts?: Record<string, number>;
  onChange: (key: string) => void;
  inset?: number;
}> = ({ filters, active, counts, onChange, inset = 0 }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    style={inset ? { marginHorizontal: -inset } : undefined}
    contentContainerStyle={[styles.chipRow, inset ? { paddingHorizontal: inset } : null]}
  >
    {filters.map((f) => {
      const on = f.key === active;
      const n = counts?.[f.key] ?? 0;
      return (
        <TouchableOpacity
          key={f.key}
          onPress={() => onChange(f.key)}
          style={[styles.chip, on && styles.chipOn]}
          // The chip is drawn 34pt tall, the height every HR list uses; the slop
          // takes the tap target to 44.
          hitSlop={{ top: 5, bottom: 5 }}
          accessibilityRole="tab"
          accessibilityState={{ selected: on }}
        >
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
          {n > 0 ? (
            <View style={[styles.chipCount, on && styles.chipCountOn]}>
              <Text style={[styles.chipCountText, on && styles.chipCountTextOn]}>{n}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

/** A labelled fact on a detail page. */
export const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  fileRow: { flexDirection: 'row', alignItems: 'center' },
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 56 },
  fileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5FB', justifyContent: 'center', alignItems: 'center' },
  fileThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.field },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  fileMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  fileRemove: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9DAF8',
    borderRadius: 16,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 56,
  },
  attachDisabled: { opacity: 0.5 },
  attachTitle: { fontSize: 14, fontWeight: '700', color: C.blue },

  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5FB', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  cardAmount: { flexShrink: 0, maxWidth: '55%', fontSize: 16, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  cardMeta: { flex: 1, fontSize: 13, color: C.body },

  approvalCard: { ...APPROVAL_CARD, padding: 14 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
  amountLine: { marginTop: 4, flexWrap: 'wrap' },
  amountText: { fontSize: 16, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  amountMeta: { fontSize: 13, color: C.body },
  reasonLine: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 6 },
  metaLine: { fontSize: 12, color: C.muted, marginTop: 8 },
  decisionRow: { marginTop: 12 },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2F7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 170 },
  badgeText: { fontSize: 11, fontWeight: '600', color: C.body },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5FB', alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  rowValue: { fontSize: 15, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  rowDash: { fontSize: 15, fontWeight: '800', color: C.muted },
  rowCode: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.4 },
  rowSub: { flex: 1, fontSize: 12, color: C.body },
  rowValueSub: { fontSize: 11, color: C.muted },

  track: { height: 5, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 4 },
  fill: { height: 5, borderRadius: 3 },

  state: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5FB', alignItems: 'center', justifyContent: 'center' },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12, textAlign: 'center' },
  stateBody: { fontSize: 13, color: C.body, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  retry: { marginTop: 14, minHeight: 44, justifyContent: 'center', paddingHorizontal: 22, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  heading: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.8 },
  headingAction: { fontSize: 13, fontWeight: '700', color: C.blue },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 13, fontWeight: '600', color: C.body },
  chipTextOn: { color: '#FFFFFF' },
  chipCount: { minWidth: 20, paddingHorizontal: 5, height: 20, borderRadius: 10, backgroundColor: '#EEF2F7', justifyContent: 'center', alignItems: 'center' },
  chipCountOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 11, fontWeight: '700', color: C.body },
  chipCountTextOn: { color: '#FFFFFF' },

  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, gap: 12 },
  detailLabel: { fontSize: 14, color: C.body },
  detailValue: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink, textAlign: 'right' },
});
