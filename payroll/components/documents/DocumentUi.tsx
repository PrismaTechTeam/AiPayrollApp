/**
 * The pieces the My Documents screen is built from — and, through the generic
 * parts (summary, group heading, list panel, status row, bottom sheet, fact
 * line, sheet note), the My Training screen too. Both checklists answer the same
 * question in the same visual language, so they share one kit rather than two
 * look-alike copies that drift apart.
 *
 * The status vocabulary is the server's — nine tokens, defined once in
 * ComplianceStatus and mirrored here. Each one gets its own icon as well as its
 * own colour, because "red means act, green means done" is invisible to a
 * colour-blind reader and to anyone glancing at the screen in sunlight. The
 * shape carries the meaning; the colour only reinforces it.
 *
 * Rows are grouped rather than listed. A flat list of eleven documents makes the
 * employee read all eleven to find the two that are their problem, so the group
 * a row belongs to is derived here from the status AND from whether the employee
 * can act at all: a missing employment contract is HR's job, not theirs, and
 * putting it under "Needs your attention" would be a lie.
 */
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import PrimaryButton, { type IconName } from '../auth/PrimaryButton';
import { plainDate, shortDate } from '../requests/RequestUi';
import { formatBytes, MAX_FILE_BYTES, type PickSource } from '../../lib/complianceFiles';
import type { DocumentRow, DocumentStatus } from '../../api/services/documentService';

// ── Status ────────────────────────────────────────────────────────────

/** Which pile a row belongs in. The order is the order the sections appear. */
export type DocumentGroup = 'action' | 'waiting' | 'provided' | 'notRequired';

interface StatusLook {
  label: string;
  icon: IconName;
  fg: string;
  bg: string;
  group: DocumentGroup;
}

export const STATUS_LOOK: Record<DocumentStatus, StatusLook> = {
  MISSING: { label: 'Not sent', icon: 'alert-circle-outline', fg: '#B91C1C', bg: '#FEE2E2', group: 'action' },
  REJECTED: { label: 'Sent back', icon: 'close-circle-outline', fg: '#B91C1C', bg: '#FEE2E2', group: 'action' },
  EXPIRED: { label: 'Expired', icon: 'calendar-remove-outline', fg: '#B91C1C', bg: '#FEE2E2', group: 'action' },
  REQUESTED: { label: 'Requested', icon: 'bell-alert-outline', fg: '#B45309', bg: '#FFF4E5', group: 'action' },
  PENDING: { label: 'Checking', icon: 'clock-outline', fg: '#B45309', bg: '#FFF4E5', group: 'waiting' },
  EXPIRING: { label: 'Expiring', icon: 'calendar-clock-outline', fg: '#B45309', bg: '#FFF4E5', group: 'provided' },
  OK: { label: 'Provided', icon: 'check-circle-outline', fg: '#15803D', bg: '#DCFCE7', group: 'provided' },
  WAIVED: { label: 'Waived', icon: 'minus-circle-outline', fg: '#64748B', bg: '#EEF2F7', group: 'notRequired' },
  'N/A': { label: 'Optional', icon: 'circle-outline', fg: '#64748B', bg: '#EEF2F7', group: 'notRequired' },
};

export function lookOf(status: string): StatusLook {
  return STATUS_LOOK[status as DocumentStatus] ?? STATUS_LOOK['N/A'];
}

/**
 * Where the row belongs.
 *
 * The one rule that is not a straight status lookup: a row the employee cannot
 * upload to can never be their action, however overdue it is. That covers an
 * HR-issued document, and every row once uploading has closed because the
 * employment ended — a red "needs your attention" over rows with no upload
 * button asks for something the screen does not allow.
 */
export function groupOf(row: DocumentRow, canUpload = true): DocumentGroup {
  const group = lookOf(row.status).group;
  if (group === 'action' && (!row.employeeCanUpload || !canUpload)) return 'waiting';
  return group;
}

export const GROUP_TITLE: Record<DocumentGroup, string> = {
  action: 'NEEDS YOUR ATTENTION',
  waiting: 'WITH HR',
  provided: 'PROVIDED',
  notRequired: 'NOT REQUIRED',
};

/** One line under the document's name: the fact that explains its state. */
export function rowMeta(row: DocumentRow): string {
  const doc = row.document;
  switch (row.status) {
    case 'REJECTED':
      return doc?.verifiedAt ? `Sent back on ${shortDate(doc.verifiedAt)}` : 'HR sent this back';
    case 'EXPIRED': {
      const days = doc?.daysToExpiry;
      if (typeof days === 'number' && days < 0) {
        const n = Math.abs(days);
        return `Expired ${n} ${n === 1 ? 'day' : 'days'} ago`;
      }
      return doc?.expiryDate ? `Expired ${plainDate(doc.expiryDate)}` : 'Expired';
    }
    case 'EXPIRING': {
      const days = doc?.daysToExpiry;
      return typeof days === 'number'
        ? `Expires in ${days} ${days === 1 ? 'day' : 'days'}`
        : `Expires ${plainDate(doc?.expiryDate)}`;
    }
    case 'REQUESTED':
      return row.dueDate ? `HR asked for this · due ${plainDate(row.dueDate)}` : 'HR asked for this';
    case 'MISSING':
      return row.employeeCanUpload ? 'Not sent yet' : 'HR has not filed this yet';
    case 'PENDING':
      return doc ? `Sent ${shortDate(doc.uploadedAt)} · waiting on HR` : 'Waiting on HR';
    case 'OK':
      return doc?.verifiedAt ? `Checked on ${shortDate(doc.verifiedAt)}` : 'Provided';
    case 'WAIVED':
      return row.waiveReason || 'Not required for you';
    default:
      return row.employeeCanUpload ? 'Send it only if you have it' : 'Issued by HR when needed';
  }
}

/**
 * What the upload button says, and how loud it is. Replacing a copy HR already
 * checked sends the document back to "Checking" and lowers the percentage until
 * HR looks again, so it is the quiet outline button with its own wording, never
 * the solid primary that a missing document gets.
 */
function uploadAction(status: DocumentStatus): { label: string; variant: 'solid' | 'outline'; replacesChecked: boolean } {
  switch (status) {
    case 'OK':
      return { label: 'Replace the checked copy', variant: 'outline', replacesChecked: true };
    case 'PENDING':
      return { label: 'Replace what I sent', variant: 'outline', replacesChecked: false };
    case 'REJECTED':
    case 'EXPIRED':
      return { label: 'Send a new copy', variant: 'solid', replacesChecked: false };
    case 'EXPIRING':
      return { label: 'Send the renewed copy', variant: 'solid', replacesChecked: false };
    default:
      return { label: 'Send this document', variant: 'solid', replacesChecked: false };
  }
}

// ── Summary ───────────────────────────────────────────────────────────

/**
 * How far along, in one short card: the percentage, "x of y", and a segmented
 * bar. The counts per pile are not repeated here — the group headings directly
 * below already carry them, and two sets of numbers for the same thing is how a
 * screen ends up contradicting itself.
 */
export const ProgressSummary: React.FC<{
  percent: number;
  caption: string;
  total: number;
  segments: { value: number; color: string }[];
}> = ({ percent, caption, total, segments }) => {
  const whole = Math.max(total, 1);
  // Typed as a percentage literal, not a plain string: a style width will not
  // accept `string`, and widening it with a cast would hide the next mistake.
  const share = (n: number): `${number}%` => `${Math.min(100, Math.max(0, (n / whole) * 100))}%`;

  return (
    <View style={styles.summary}>
      <View style={styles.summaryTop}>
        <Text style={styles.summaryPercent}>{percent}%</Text>
        <Text style={styles.summaryPercentLabel}>complete</Text>
        <Text style={styles.summaryCount} numberOfLines={1}>{caption}</Text>
      </View>
      <View style={styles.track} accessibilityLabel={`${percent} percent complete, ${caption}`}>
        {segments.map((s, i) => (
          <View key={i} style={[styles.fill, { width: share(s.value), backgroundColor: s.color }]} />
        ))}
      </View>
    </View>
  );
};

/**
 * The documents summary. The bar is segmented rather than a single fill so the
 * "with HR" slice is visible — that is the part the employee must not be nagged
 * about, and a plain percentage hides it. The slices are counted from the same
 * grouped rows the list shows, so the card and the list cannot disagree.
 */
export const ComplianceSummary: React.FC<{
  percent: number;
  required: number;
  satisfied: number;
  waiting: number;
  actionNeeded: number;
}> = ({ percent, required, satisfied, waiting, actionNeeded }) => (
  <ProgressSummary
    percent={percent}
    caption={`${satisfied} of ${required} provided`}
    total={required}
    segments={[
      { value: satisfied, color: '#16A34A' },
      { value: waiting, color: '#F59E0B' },
      { value: actionNeeded, color: '#DC2626' },
    ]}
  />
);

// ── Notice ────────────────────────────────────────────────────────────

/**
 * The server's own words for why uploading is closed. Shown once at the top
 * rather than as a failure at submit time — the difference between knowing and
 * finding out after choosing a file.
 */
export const NoticeBanner: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.notice}>
    <MaterialCommunityIcons name="lock-outline" size={18} color="#B45309" />
    <Text style={styles.noticeText}>{message}</Text>
  </View>
);

// ── List ──────────────────────────────────────────────────────────────

export const GroupHeading: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <View style={styles.headingRow}>
    <Text style={styles.heading}>{title}</Text>
    <Text style={styles.headingCount}>{count}</Text>
  </View>
);

/** The white card a group of rows sits on. */
export const ListPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.panel}>{children}</View>
);

export const DocumentPanel = ListPanel;

/** One checklist row: status disc, name, the one fact that explains it, chevron. */
export const StatusRow: React.FC<{
  icon: IconName;
  fg: string;
  bg: string;
  title: string;
  meta: string;
  /** Red only when the row is the reader's own action; otherwise body grey. */
  urgent: boolean;
  optional?: boolean;
  badge?: IconName;
  onPress: () => void;
  last?: boolean;
  accessibilityLabel: string;
}> = ({ icon, fg, bg, title, meta, urgent, optional = false, badge, onPress, last = false, accessibilityLabel }) => (
  <TouchableOpacity
    style={[styles.row, !last && styles.rowDivider]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <View style={[styles.rowIcon, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={18} color={fg} />
    </View>

    <View style={styles.rowBody}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {optional ? <Text style={styles.rowOptional}>Optional</Text> : null}
      </View>
      <Text style={[styles.rowMeta, { color: urgent ? fg : C.body }]} numberOfLines={1}>
        {meta}
      </Text>
    </View>

    {badge ? <MaterialCommunityIcons name={badge} size={16} color={C.muted} style={styles.rowBadge} /> : null}
    <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
  </TouchableOpacity>
);

export const DocumentRowItem: React.FC<{
  row: DocumentRow;
  group: DocumentGroup;
  onPress: () => void;
  last?: boolean;
}> = ({ row, group, onPress, last = false }) => {
  const look = lookOf(row.status);
  const meta = rowMeta(row);
  return (
    <StatusRow
      icon={look.icon}
      fg={look.fg}
      bg={look.bg}
      title={row.name}
      meta={meta}
      urgent={group === 'action'}
      // A waived row is also "not required", but saying so here would blur a
      // decision HR made about this person with a property of the type.
      optional={!row.isRequired && row.status !== 'WAIVED'}
      onPress={onPress}
      last={last}
      accessibilityLabel={`${row.name}. ${look.label}. ${meta}`}
    />
  );
};

// ── Sheet parts ───────────────────────────────────────────────────────

/**
 * The bottom sheet both checklists open a row in.
 *
 * Edge-to-edge on both platforms (status and navigation bar translucent) and
 * padded by the bottom safe-area inset, so the footer button never sits under
 * the iPhone home indicator or the Android gesture bar. Every message the sheet
 * needs to give is drawn inside it (see SheetNote): on iOS a second modal
 * raised while this one is up is refused, so a dialog would silently not show.
 */
export const BottomSheet: React.FC<{
  /** Backdrop tap and the Android back button. */
  onDismiss: () => void;
  footerLabel: string;
  onFooter: () => void;
  children: React.ReactNode;
}> = ({ onDismiss, footerLabel, onFooter, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss" />
        <View style={[styles.sheet, { paddingBottom: Math.max(8, insets.bottom) }]}>
          <View style={styles.grabber} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
            {children}
          </ScrollView>
          <TouchableOpacity style={styles.sheetClose} onPress={onFooter} accessibilityRole="button">
            <Text style={styles.sheetCloseText}>{footerLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/** Status disc, name and status pill at the top of a sheet. */
export const SheetHead: React.FC<{ icon: IconName; fg: string; bg: string; title: string; label: string }> = ({
  icon,
  fg,
  bg,
  title,
  label,
}) => (
  <View style={styles.sheetHead}>
    <View style={[styles.sheetIcon, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={22} color={fg} />
    </View>
    <View style={styles.flex}>
      <Text style={styles.sheetTitle} numberOfLines={2}>{title}</Text>
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
      </View>
    </View>
  </View>
);

/** One "label ....... value" line in a sheet. */
export const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.fact}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue} numberOfLines={2}>{value}</Text>
  </View>
);

export const FactList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.facts}>{children}</View>
);

export type SheetNoteTone = 'danger' | 'warning' | 'success' | 'progress';

export interface SheetNoteValue {
  tone: SheetNoteTone;
  text: string;
}

const NOTE_LOOK: Record<SheetNoteTone, { icon: IconName; fg: string; bg: string }> = {
  danger: { icon: 'alert-circle-outline', fg: '#B91C1C', bg: '#FEF2F2' },
  warning: { icon: 'alert-outline', fg: '#B45309', bg: '#FFF8EC' },
  success: { icon: 'check-circle-outline', fg: '#15803D', bg: '#EAF8EF' },
  progress: { icon: 'progress-upload', fg: C.ink, bg: '#EEF3FF' },
};

/**
 * One line of feedback inside a sheet: what failed, what worked, or what is
 * happening right now. Drawn in place rather than raised as a dialog — see
 * BottomSheet for why.
 */
export const SheetNote: React.FC<SheetNoteValue> = ({ tone, text }) => {
  const look = NOTE_LOOK[tone];
  return (
    <View style={[styles.note, { backgroundColor: look.bg }]} accessibilityLiveRegion="polite">
      {tone === 'progress' ? (
        <ActivityIndicator size="small" color={C.blue} />
      ) : (
        <MaterialCommunityIcons name={look.icon} size={18} color={look.fg} />
      )}
      <Text style={[styles.noteText, { color: look.fg }]}>{text}</Text>
    </View>
  );
};

// ── One document ──────────────────────────────────────────────────────

export type SheetStep = 'detail' | 'source';
export type DocumentBusy = 'upload' | 'download' | 'template' | null;

const SOURCES: { key: PickSource; icon: IconName; title: string; hint: string }[] = [
  { key: 'camera', icon: 'camera-outline', title: 'Take a photo', hint: 'Best for a card or a certificate' },
  { key: 'library', icon: 'image-outline', title: 'Choose a photo', hint: 'JPEG or PNG from your gallery' },
  { key: 'document', icon: 'file-pdf-box', title: 'Choose a PDF', hint: 'A scan or a statement you downloaded' },
];

/**
 * Everything about one document, on its own surface.
 *
 * It is a sheet and not a section on the list because the list answers "what do
 * I still owe" and this answers "what do I do about this one".
 *
 * Choosing where the file comes from happens inside this same sheet (the
 * 'source' step), not in a second one. Closing one modal and opening another in
 * the same moment, then launching the camera while that one is still animating
 * away, is refused on iOS — the picker never appeared and "Send" just made the
 * sheet vanish. The pickers present from the top-most screen, so launching them
 * with this sheet still up works on both platforms. The sheet then stays open
 * while the file uploads, so the person can see it is happening.
 */
export const DocumentSheet: React.FC<{
  row: DocumentRow | null;
  canUpload: boolean;
  step: SheetStep;
  busy: DocumentBusy;
  note: SheetNoteValue | null;
  onClose: () => void;
  onUpload: () => void;
  onBack: () => void;
  onPick: (source: PickSource) => void;
  onDownload: () => void;
  onTemplate: () => void;
}> = ({ row, canUpload, step, busy, note, onClose, onUpload, onBack, onPick, onDownload, onTemplate }) => {
  if (!row) return null;

  const look = lookOf(row.status);
  const doc = row.document;
  const uploadable = row.employeeCanUpload && canUpload;
  const upload = uploadAction(row.status);
  const choosing = step === 'source' && uploadable && busy !== 'upload';

  return (
    <BottomSheet
      onDismiss={choosing ? onBack : onClose}
      footerLabel={choosing ? 'Back' : 'Close'}
      onFooter={choosing ? onBack : onClose}
    >
      <SheetHead icon={look.icon} fg={look.fg} bg={look.bg} title={row.name} label={look.label} />

      {choosing ? (
        <>
          <Text style={styles.pickHint}>PDF, JPEG or PNG · up to {formatBytes(MAX_FILE_BYTES)}</Text>
          {upload.replacesChecked ? (
            <SheetNote tone="warning" text="HR will need to check the new copy." />
          ) : null}
          <View style={styles.pickList}>
            {SOURCES.map((o, index) => (
              <TouchableOpacity
                key={o.key}
                style={[styles.pickRow, index < SOURCES.length - 1 && styles.rowDivider]}
                onPress={() => onPick(o.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${o.title}. ${o.hint}`}
              >
                <View style={styles.pickIcon}>
                  <MaterialCommunityIcons name={o.icon} size={20} color={C.blue} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.pickRowTitle}>{o.title}</Text>
                  <Text style={styles.pickRowHint}>{o.hint}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
              </TouchableOpacity>
            ))}
          </View>
          {note ? <SheetNote tone={note.tone} text={note.text} /> : null}
        </>
      ) : (
        <>
          {row.status === 'REJECTED' && doc?.rejectionReason ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Why it was sent back</Text>
              <Text style={styles.reasonText}>{doc.rejectionReason}</Text>
            </View>
          ) : null}

          {row.status === 'WAIVED' && row.waiveReason ? (
            <View style={styles.quietBox}>
              <Text style={styles.quietText}>{row.waiveReason}</Text>
            </View>
          ) : null}

          {/* HR's own words for this document type — written by them for the
              employee, so they are shown as given. */}
          {row.employeeInstructions ? (
            <View style={styles.instructions}>
              <MaterialCommunityIcons name="information-outline" size={18} color={C.blue} />
              <Text style={styles.instructionsText}>{row.employeeInstructions}</Text>
            </View>
          ) : null}

          <FactList>
            {!row.employeeCanUpload ? <Fact label="Issued by" value="HR" /> : null}
            {row.dueDate ? <Fact label="Due" value={plainDate(row.dueDate)} /> : null}
            {doc ? <Fact label="File" value={doc.fileName} /> : null}
            {doc?.fileSizeKb ? <Fact label="Size" value={formatBytes(doc.fileSizeKb * 1024)} /> : null}
            {doc ? <Fact label="Sent" value={shortDate(doc.uploadedAt)} /> : null}
            {doc?.verifiedAt ? (
              <Fact label="Checked by" value={`${doc.verifiedByName ?? 'HR'} · ${shortDate(doc.verifiedAt)}`} />
            ) : null}
            {doc?.expiryDate ? <Fact label="Expires" value={plainDate(doc.expiryDate)} /> : null}
          </FactList>

          {note ? <SheetNote tone={note.tone} text={note.text} /> : null}

          <View style={styles.actions}>
            {uploadable ? (
              <PrimaryButton
                icon="tray-arrow-up"
                label={upload.label}
                onPress={onUpload}
                variant={upload.variant}
                loading={busy === 'upload'}
                disabled={busy !== null && busy !== 'upload'}
                compact
              />
            ) : null}
            {doc ? (
              <PrimaryButton
                icon="tray-arrow-down"
                label="Download my copy"
                onPress={onDownload}
                variant="outline"
                loading={busy === 'download'}
                disabled={busy !== null && busy !== 'download'}
                compact
              />
            ) : null}
            {row.hasTemplate ? (
              <PrimaryButton
                icon="file-document-outline"
                label="Get the blank form"
                onPress={onTemplate}
                variant="outline"
                loading={busy === 'template'}
                disabled={busy !== null && busy !== 'template'}
                compact
              />
            ) : null}
          </View>
        </>
      )}
    </BottomSheet>
  );
};

// ── States ────────────────────────────────────────────────────────────

/** Loading, failed, empty. Each one says something and offers a way on. */
export const DocumentState: React.FC<{
  icon: IconName;
  title: string;
  body: string;
  tone?: 'plain' | 'danger';
  onRetry?: () => void;
}> = ({ icon, title, body, tone = 'plain', onRetry }) => (
  <View style={styles.state}>
    <View style={[styles.stateIcon, tone === 'danger' && styles.stateIconDanger]}>
      <MaterialCommunityIcons name={icon} size={26} color={tone === 'danger' ? C.danger : C.blue} />
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

export const Busy: React.FC = () => (
  <View style={styles.busy}>
    <ActivityIndicator color={C.blue} />
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },

  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  summaryPercent: { fontSize: 24, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  summaryPercentLabel: { fontSize: 13, color: C.body },
  summaryCount: { flex: 1, fontSize: 13, color: C.body, textAlign: 'right' },

  track: { flexDirection: 'row', height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginTop: 10 },
  fill: { height: 6 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#FCE4BE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#8A5A16' },

  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  heading: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.8 },
  headingCount: { fontSize: 12, fontWeight: '800', color: C.muted },

  panel: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  rowOptional: { fontSize: 11, color: C.muted },
  rowMeta: { fontSize: 12 },
  rowBadge: { marginRight: -4 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 12 },
  sheetScroll: { paddingBottom: 4 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },

  reasonBox: { backgroundColor: C.dangerBg, borderRadius: 14, padding: 12, marginTop: 12 },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 2 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.ink },

  quietBox: { backgroundColor: C.field, borderRadius: 14, padding: 12, marginTop: 12 },
  quietText: { fontSize: 14, lineHeight: 20, color: C.body },

  instructions: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  instructionsText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.body },

  facts: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  fact: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  factLabel: { fontSize: 13, color: C.body },
  factValue: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink, textAlign: 'right' },

  note: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },

  actions: { marginTop: 14, gap: 10 },

  sheetClose: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  sheetCloseText: { fontSize: 15, fontWeight: '700', color: C.body },

  pickHint: { fontSize: 12, color: C.muted, marginTop: 12 },
  pickList: { marginTop: 4 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 56 },
  pickIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  pickRowTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  pickRowHint: { fontSize: 12, color: C.body, marginTop: 1 },

  state: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 },
  stateIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 10, textAlign: 'center' },
  stateBody: { fontSize: 13, color: C.body, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  retry: { marginTop: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  busy: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
});
