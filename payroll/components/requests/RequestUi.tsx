/**
 * The pieces the request screens share: the header, the status pill, the file
 * row, the "add a file" control, the bottom sheet, and the loading / failed /
 * empty states. One place, so the employee's view of an attachment and HR's
 * view of the same attachment cannot drift apart, and so the four screens are
 * the same height in the same places.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';
import { APPROVAL_CARD } from '../ui/ApprovalCard';
import type { RequestAttachment } from '../../api/services/requestService';
import { formatBytes, iconForFile, MAX_FILE_BYTES, ALLOWED_LABEL, type PickSource } from '../../lib/requestAttachments';
import { serverMessage } from '../../lib/serverMessage';
import { SHORT_MONTHS, inMalaysia, malaysianDayNumber } from '../../lib/dates';

// ── Status ────────────────────────────────────────────────────────────

export type RequestStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN';

// WITHDRAWN is listed because anything unknown reads as Pending below, and an item
// the employee had just taken back came back labelled Pending, as if the withdraw failed.
export const STATUS_LOOK: Record<RequestStatus, { label: string; bg: string; fg: string; icon: IconName }> = {
  DRAFT: { label: 'Draft', bg: '#EEF2F7', fg: '#64748B', icon: 'file-edit-outline' },
  PENDING: { label: 'Pending', bg: '#FFF4E5', fg: '#B45309', icon: 'clock-outline' },
  APPROVED: { label: 'Approved', bg: '#DCFCE7', fg: '#15803D', icon: 'check' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', fg: '#B91C1C', icon: 'close' },
  CANCELLED: { label: 'Cancelled', bg: '#EEF2F7', fg: '#64748B', icon: 'minus' },
  WITHDRAWN: { label: 'Withdrawn', bg: '#EEF2F7', fg: '#64748B', icon: 'undo-variant' },
};

export function statusOf(raw: string | null | undefined): RequestStatus {
  const key = (raw ?? '').toUpperCase();
  return (key in STATUS_LOOK ? key : 'PENDING') as RequestStatus;
}

export const StatusPill: React.FC<{ status: string; large?: boolean }> = ({ status, large = false }) => {
  const look = STATUS_LOOK[statusOf(status)];
  return (
    <View style={[styles.pill, large && styles.pillLarge, { backgroundColor: look.bg }]}>
      <MaterialCommunityIcons name={look.icon} size={large ? 16 : 13} color={look.fg} />
      <Text style={[styles.pillText, large && styles.pillTextLarge, { color: look.fg }]}>{look.label}</Text>
    </View>
  );
};

// ── Dates ─────────────────────────────────────────────────────────────

/** Server timestamps are UTC; some arrive without a zone marker. */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const withZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Every date is written "4 Sep 2026" in Malaysia time, built by hand rather
// than with toLocaleDateString: that follows the phone, and an Android phone
// set to English (US), common here, printed "Sep 4, 2026", while a phone
// outside UTC+8 put a request sent before 8am on the previous day.
const MONTHS = SHORT_MONTHS;
const inMyt = inMalaysia;
const mytDayNumber = (d: Date): number => malaysianDayNumber(d.getTime());

export function shortDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return '—';
  const t = inMyt(d);
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

export function dateAndTime(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return '';
  const t = inMyt(d);
  const h = t.getUTCHours();
  const mm = String(t.getUTCMinutes()).padStart(2, '0');
  return `${shortDate(iso)}, ${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

/** "4 Sep" this year, "4 Sep 2025" otherwise: the short form a card's meta line uses. */
export function dayMonth(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return '—';
  const t = inMyt(d);
  const sameYear = t.getUTCFullYear() === inMyt(new Date()).getUTCFullYear();
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}${sameYear ? '' : ` ${t.getUTCFullYear()}`}`;
}

/**
 * Whole Malaysian calendar days between the timestamp and today: 0 on the day
 * it was sent, whatever the hour. Null when the timestamp cannot be read.
 */
export function waitingDays(iso: string | null | undefined): number | null {
  const d = parseDate(iso);
  if (!d) return null;
  return Math.max(mytDayNumber(new Date()) - mytDayNumber(d), 0);
}

/** "waiting 34 days" for an approval card's meta line; the Leave and Claims cards use it too. */
export function waitingLabel(iso: string | null | undefined): string {
  const days = waitingDays(iso);
  if (days === null) return '';
  if (days === 0) return 'sent today';
  return `waiting ${days} ${days === 1 ? 'day' : 'days'}`;
}

/** A start date arrives as a plain YYYY-MM-DD and must not be shifted by a zone. */
export function plainDate(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return shortDate(value);
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

// ── People and types ──────────────────────────────────────────────────

/** Two letters for an approval card's avatar. */
export function initials(name?: string | null): string {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

// Request types carry no colour of their own, so one is picked from the type's
// id or name: the same type is the same dot on every card and on its page.
// No brand blue here; the brief keeps that for buttons and the active tab.
const TYPE_DOTS = ['#7C3AED', '#0D9488', '#D97706', '#DB2777', '#0891B2', '#65A30D', '#9333EA', '#EA580C'];

export function requestTypeColor(key: string | null | undefined): string {
  const s = (key ?? '').toUpperCase();
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return TYPE_DOTS[Math.abs(hash) % TYPE_DOTS.length];
}

// ── Errors ────────────────────────────────────────────────────────────

/**
 * The request screens' name for serverMessage, which now puts a rights refusal
 * ("Access denied. Required permission: REQUEST_TYPE.EDIT") in plain words for
 * every module. Kept so the call sites read the same as before.
 */
export function requestError(err: unknown, fallback: string): string {
  return serverMessage(err, fallback);
}

// ── Layout helpers ────────────────────────────────────────────────────

/**
 * The white card of the HR design language: radius 16, 1px line border, a
 * neutral shadow. One object so the approval lists, the details pages and the
 * empty states cannot drift apart again.
 */
export const CARD_SURFACE = APPROVAL_CARD;

/**
 * Whether the on-screen keyboard is up. A footer drops its home-indicator
 * padding while it is, so the Send button sits snug on the keyboard instead of
 * floating a thumb's width above it.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // iOS announces the keyboard before it moves; Android only once it has.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

// ── Header ────────────────────────────────────────────────────────────

/** Back arrow, centred title with at most one muted line under it, and an optional action on the right. */
export const RequestHeader: React.FC<{
  title: string;
  subtitle?: string | null;
  onBack: () => void;
  right?: React.ReactNode;
}> = ({ title, subtitle, onBack, right }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.headerButton}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
    </TouchableOpacity>
    <View style={styles.headerText} pointerEvents="none">
      <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    <View style={styles.headerRight}>{right}</View>
  </View>
);

// ── States ────────────────────────────────────────────────────────────

/**
 * The card a list shows instead of rows: either it could not load (danger, with
 * a way to try again) or there is genuinely nothing in it.
 */
export const ListState: React.FC<{
  icon: IconName;
  title: string;
  body?: string;
  tone?: 'info' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, body, tone = 'info', actionLabel, onAction }) => (
  <View style={styles.stateCard}>
    <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
      <MaterialCommunityIcons name={icon} size={26} color={tone === 'danger' ? C.danger : C.blue} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    {body ? <Text style={styles.stateBody}>{body}</Text> : null}
    {actionLabel && onAction ? (
      <TouchableOpacity onPress={onAction} style={styles.stateAction} activeOpacity={0.75} accessibilityRole="button">
        <Text style={styles.stateActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/**
 * A refresh that failed while rows are already on screen. Without it the old
 * rows stay up looking current and nothing says they may be out of date.
 */
export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={styles.banner} accessibilityRole="alert">
    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
    <Text style={styles.bannerText} numberOfLines={2}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity
        onPress={onRetry}
        style={styles.bannerRetry}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.bannerRetryText}>Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

// ── Attachments ───────────────────────────────────────────────────────

export const AttachmentRow: React.FC<{
  file: RequestAttachment;
  onOpen: () => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  last?: boolean;
}> = ({ file, onOpen, onRemove, last = false }) => {
  const [busy, setBusy] = useState(false);
  const fromHr = file.uploadedByRole === 'HR';

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onOpen();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.fileRow, !last && styles.fileDivider]}>
      <TouchableOpacity
        style={styles.fileMain}
        onPress={open}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open ${file.fileName}`}
      >
        <View style={[styles.fileIcon, fromHr && styles.fileIconHr]}>
          <MaterialCommunityIcons name={iconForFile(file.fileName)} size={20} color={fromHr ? '#7C3AED' : C.blue} />
        </View>
        <View style={styles.fileText}>
          <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
          <Text style={styles.fileMeta} numberOfLines={1}>
            {formatBytes(file.fileSizeBytes)}
            {file.uploadedByName ? ` · ${file.uploadedByName}` : ''}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={C.blue} />
        ) : (
          <MaterialCommunityIcons name="tray-arrow-down" size={20} color={C.muted} />
        )}
      </TouchableOpacity>
      {onRemove ? (
        <TouchableOpacity
          onPress={() => { void onRemove(); }}
          style={styles.fileRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${file.fileName}`}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialCommunityIcons name="close" size={18} color={C.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

/** The dashed "attach a file" target, with the rules written under it. */
export const AttachButton: React.FC<{
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  label?: string;
}> = ({ onPress, busy = false, disabled = false, label = 'Add a file' }) => (
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
      <MaterialCommunityIcons name="paperclip" size={20} color={C.blue} />
    )}
    <View style={styles.attachText}>
      <Text style={styles.attachTitle}>{busy ? 'Uploading…' : label}</Text>
      <Text style={styles.attachHint}>{ALLOWED_LABEL}, up to {formatBytes(MAX_FILE_BYTES)}</Text>
    </View>
  </TouchableOpacity>
);

// ── Sheets ────────────────────────────────────────────────────────────

/**
 * A panel that rises from the bottom over a dimmed screen. The bottom padding
 * follows the safe area: Android draws modals edge to edge, and an iPhone's
 * home-gesture strip sits where a fixed 16pt margin would put the Cancel row.
 */
export const RequestSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** iOS only: fires once the fade-out has finished. */
  onDismiss?: () => void;
  /** Lifts the sheet above the keyboard, for sheets with a text field. */
  avoidKeyboard?: boolean;
  /** Off for sheets that carry their own Cancel / Save buttons. */
  showCancel?: boolean;
}> = ({ visible, onClose, title, children, onDismiss, avoidKeyboard = false, showCancel = true }) => {
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();
  const bottom = avoidKeyboard && keyboardUp ? 8 : 12 + insets.bottom;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      {/* "padding" on both platforms: Android draws this modal edge to edge,
          so the window no longer shrinks for the keyboard on its own. */}
      <KeyboardAvoidingView behavior="padding" enabled={avoidKeyboard} style={styles.flex}>
        <View style={[styles.sheetBackdrop, { paddingBottom: bottom }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{title}</Text>
            {children}
            {showCancel ? (
              <TouchableOpacity style={styles.sheetCancel} onPress={onClose} accessibilityRole="button">
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/**
 * Where the file comes from. Three plain rows rather than the OS action sheet,
 * which on Android is an Alert and looks like a different app.
 *
 * The choice is handed back only once the sheet has gone. iOS will not present
 * the camera, the photo library or the document picker over a modal that is
 * still fading out — the call fails silently and "Take a photo" appears to do
 * nothing. iOS reports the end of the fade through onDismiss; Android never
 * calls it, and the new renderer does not always either, so a timer just past
 * the fade is the backstop. Whichever comes first wins; the other finds nothing
 * to do.
 */
export const PickSourceSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPick: (source: PickSource) => void;
}> = ({ visible, onClose, onPick }) => {
  const chosen = useRef<PickSource | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deliver = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const source = chosen.current;
    chosen.current = null;
    if (source) onPick(source);
  }, [onPick]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const choose = (source: PickSource) => {
    if (chosen.current) return;
    chosen.current = source;
    onClose();
    timer.current = setTimeout(deliver, Platform.OS === 'ios' ? 500 : 250);
  };

  const options: { key: PickSource; icon: IconName; title: string; hint: string }[] = [
    { key: 'camera', icon: 'camera-outline', title: 'Take a photo', hint: 'Use the camera now' },
    { key: 'library', icon: 'image-outline', title: 'Choose a photo', hint: 'From your gallery' },
    { key: 'document', icon: 'file-document-outline', title: 'Choose a document', hint: 'PDF, Word or Excel' },
  ];

  return (
    <RequestSheet visible={visible} onClose={onClose} onDismiss={deliver} title="Attach a file">
      {options.map((o, index) => (
        <TouchableOpacity
          key={o.key}
          style={[styles.sheetRow, index < options.length - 1 && styles.fileDivider]}
          onPress={() => choose(o.key)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.fileIcon}>
            <MaterialCommunityIcons name={o.icon} size={20} color={C.blue} />
          </View>
          <View style={styles.fileText}>
            <Text style={styles.fileName}>{o.title}</Text>
            <Text style={styles.fileMeta}>{o.hint}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
        </TouchableOpacity>
      ))}
    </RequestSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillLarge: { paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextLarge: { fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 8 },
  headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 84, right: 84, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  // 18pt, the size LeaveHeader and AccountPage use, so moving between modules does not
  // make the title jump. 700, the HR design language's weight for every title.
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.muted, marginTop: 1 },
  headerRight: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },

  // The same white card as every row it stands in for: 1px line border and a
  // neutral shadow, not the blue-tinted one the brief does not ask for.
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  stateIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, textAlign: 'center' },
  stateBody: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center' },
  stateAction: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#C9DAF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateActionText: { fontSize: 14, fontWeight: '700', color: C.blue },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.danger },
  bannerRetry: { height: 32, paddingHorizontal: 10, justifyContent: 'center' },
  bannerRetryText: { fontSize: 13, fontWeight: '800', color: C.danger },

  fileRow: { flexDirection: 'row', alignItems: 'center' },
  fileDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 44 },
  fileIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  fileIconHr: { backgroundColor: '#F1EAFE' },
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
    borderRadius: 14,
    backgroundColor: '#F8FBFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  attachDisabled: { opacity: 0.5 },
  attachText: { flex: 1 },
  attachTitle: { fontSize: 14, fontWeight: '700', color: C.blue },
  attachHint: { fontSize: 12, color: C.body, marginTop: 2 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 12 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    maxHeight: '88%',
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 4 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sheetCancel: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: C.body },
});
