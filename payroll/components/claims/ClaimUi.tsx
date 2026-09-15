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
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import { StatusPill, statusOf } from '../requests/RequestUi';
import { formatBytes, type PickedFile } from '../../lib/requestAttachments';
import type { ClaimApplication, ClaimBalance, ClaimType } from '../../api/services/claimService';

export { StatusPill, statusOf, shortDate, dateAndTime, plainDate, parseDate } from '../requests/RequestUi';
export { goTo } from '../leave/LeaveUi';

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

/** What the person typed, as a number, or null when it is not one. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim();
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
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
 */
export const ReceiptRow: React.FC<{
  fileName: string;
  onOpen?: () => void | Promise<void>;
  onRemove?: () => void;
  hint?: string;
}> = ({ fileName, onOpen, onRemove, hint }) => {
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
        <View style={styles.fileIcon}>
          <MaterialCommunityIcons name={receiptIcon(fileName)} size={22} color={C.blue} />
        </View>
        <View style={styles.fileText}>
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.fileMeta} numberOfLines={1}>{hint ?? 'Tap to open'}</Text>
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={C.blue} />
        ) : onOpen ? (
          <MaterialCommunityIcons name="tray-arrow-down" size={20} color={C.muted} />
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

/** One claim in a list: what it was for, how much, and where it stands. */
export const ClaimCard: React.FC<{
  claim: ClaimApplication;
  onPress?: () => void;
  /** The approval queue needs to say whose claim this is. */
  showEmployee?: boolean;
}> = ({ claim, onPress, showEmployee = false }) => {
  const tint = claimTint(claim.claimTypeId);
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
      <View style={[styles.cardIcon, { backgroundColor: claimWash(tint) }]}>
        <MaterialCommunityIcons name={claimIcon({ name: claim.claimTypeName })} size={22} color={tint} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {showEmployee ? claim.employeeName ?? 'Employee' : title}
          </Text>
          <Text style={styles.cardAmount}>{money(claim.amount)}</Text>
        </View>

        <View style={styles.cardTop}>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {showEmployee ? title : claimDate(claim.transDate)}
          </Text>
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
 * A transaction date arrives as a full timestamp but means a calendar day, so it
 * is read off the string rather than through a Date that a zone could shift.
 */
export function claimDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return '—';
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * One claim type's allowance.
 *
 * Two shapes, one row, for the same reason leave has two: a type with no limit
 * set has nothing to count down, and printing "RM 0.00 left" for it would tell
 * the employee they cannot claim, which is false.
 */
export const BalanceRow: React.FC<{
  balance: ClaimBalance;
  last?: boolean;
  onPress?: () => void;
}> = ({ balance, last = false, onPress }) => {
  const tint = claimTint(balance.claimTypeId);
  const limit = balance.yearlyLimit > 0 ? balance.yearlyLimit : balance.monthlyLimit;
  const capped = limit > 0;
  const yearly = balance.yearlyLimit > 0;
  const used = yearly
    ? balance.ytdClaimed + balance.ytdPending
    : balance.mtdClaimed + balance.mtdPending;
  const remaining = yearly ? balance.yearlyRemaining : balance.monthlyRemaining;
  const fraction = capped ? Math.min(1, Math.max(0, used / limit)) : 0;

  const Row = onPress ? TouchableOpacity : View;

  return (
    <Row
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        capped
          ? `${balance.claimTypeName}, ${money(remaining)} left of ${money(limit)}`
          : `${balance.claimTypeName}, no limit set`
      }
    >
      <View style={[styles.rowIcon, { backgroundColor: claimWash(tint) }]}>
        <MaterialCommunityIcons name={claimIcon({ name: balance.claimTypeName })} size={20} color={tint} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{balance.claimTypeName}</Text>
          <Text style={capped ? styles.rowValue : styles.rowDash}>{capped ? money(remaining) : '–'}</Text>
        </View>

        <View style={styles.rowTop}>
          <Text style={styles.rowSub} numberOfLines={1}>
            {capped ? `${yearly ? 'Yearly' : 'Monthly'} limit ${money(limit)}` : 'No limit set'}
          </Text>
          {capped ? <Text style={styles.rowValueSub}>left</Text> : null}
        </View>

        {capped ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: tint }]} />
          </View>
        ) : null}
      </View>
    </Row>
  );
};

/** One claim type, read-only: what it is called and what it allows. */
export const ClaimTypeRow: React.FC<{ type: ClaimType; last?: boolean }> = ({ type, last = false }) => {
  const tint = claimTint(type.id);
  const limits: string[] = [];
  if (type.yearlyLimit != null && type.yearlyLimit > 0) limits.push(`${money(type.yearlyLimit)} a year`);
  if (type.monthlyLimit != null && type.monthlyLimit > 0) limits.push(`${money(type.monthlyLimit)} a month`);

  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={[styles.rowIcon, { backgroundColor: claimWash(tint) }]}>
        <MaterialCommunityIcons name={claimIcon(type)} size={20} color={tint} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{type.name}</Text>
          <Text style={styles.rowCode}>{type.code}</Text>
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

/** Loading, failed, empty, locked. Every one says something and offers a way on. */
export const ClaimState: React.FC<{
  icon: IconName;
  title: string;
  body: string;
  tone?: 'plain' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, body, tone = 'plain', actionLabel, onAction }) => (
  <View style={styles.state}>
    <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
      <MaterialCommunityIcons name={icon} size={30} color={tone === 'danger' ? C.danger : C.blue} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateBody}>{body}</Text>
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
      <TouchableOpacity onPress={onAction} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

/** The status strip. Counts are shown only where there is something to count. */
export const FilterChips: React.FC<{
  filters: StatusFilter[];
  active: string;
  counts?: Record<string, number>;
  onChange: (key: string) => void;
}> = ({ filters, active, counts, onChange }) => (
  <View style={styles.chipRow}>
    {filters.map((f) => {
      const on = f.key === active;
      const n = counts?.[f.key] ?? 0;
      return (
        <TouchableOpacity
          key={f.key}
          onPress={() => onChange(f.key)}
          style={[styles.chip, on && styles.chipOn]}
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
  </View>
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
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  fileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
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
    paddingVertical: 14,
  },
  attachDisabled: { opacity: 0.5 },
  attachTitle: { fontSize: 14, fontWeight: '700', color: C.blue },

  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  cardAmount: { fontSize: 16, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  cardMeta: { flex: 1, fontSize: 13, color: C.body },

  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2F7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 170 },
  badgeText: { fontSize: 11, fontWeight: '600', color: C.body },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  rowValue: { fontSize: 15, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  rowDash: { fontSize: 15, fontWeight: '800', color: C.muted },
  rowCode: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.4 },
  rowSub: { flex: 1, fontSize: 12, color: C.body },
  rowValueSub: { fontSize: 11, color: C.muted },

  track: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 5 },
  fill: { height: 6, borderRadius: 3 },

  state: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12, textAlign: 'center' },
  stateBody: { fontSize: 13, color: C.body, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  heading: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.8 },
  headingAction: { fontSize: 13, fontWeight: '700', color: C.blue },

  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 13, fontWeight: '700', color: '#3B4A63' },
  chipTextOn: { color: '#FFFFFF' },
  chipCount: { minWidth: 20, paddingHorizontal: 5, height: 20, borderRadius: 10, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  chipCountOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipCountText: { fontSize: 11, fontWeight: '800', color: C.blue },
  chipCountTextOn: { color: '#FFFFFF' },

  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, gap: 12 },
  detailLabel: { fontSize: 14, color: C.body },
  detailValue: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink, textAlign: 'right' },
});
