/**
 * The pieces the My Documents screen is built from.
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
 * The one rule that is not a straight status lookup: a document the employee is
 * not allowed to upload can never be their action, however overdue it is.
 */
export function groupOf(row: DocumentRow): DocumentGroup {
  const group = lookOf(row.status).group;
  if (group === 'action' && !row.employeeCanUpload) return 'waiting';
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

// ── Summary ───────────────────────────────────────────────────────────

/**
 * The whole picture in one card: how far along, and the three numbers that say
 * who has to move next. The bar is segmented rather than a single fill so the
 * "waiting on HR" slice is visible — that is the part the employee must not be
 * nagged about, and a plain percentage hides it.
 */
export const ComplianceSummary: React.FC<{
  percent: number;
  required: number;
  satisfied: number;
  pending: number;
  actionNeeded: number;
}> = ({ percent, required, satisfied, pending, actionNeeded }) => {
  const total = Math.max(required, 1);
  // Typed as a percentage literal, not a plain string: a style width will not
  // accept `string`, and widening it with a cast would hide the next mistake.
  const share = (n: number): `${number}%` => `${Math.min(100, (n / total) * 100)}%`;

  return (
    <View style={styles.summary}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryHeadline}>
          <Text style={styles.summaryPercent}>{percent}%</Text>
          <Text style={styles.summaryPercentLabel}>complete</Text>
        </View>
        <Text style={styles.summaryCount}>
          {satisfied} of {required} documents
        </Text>
      </View>

      <View style={styles.track} accessibilityLabel={`${percent} percent complete`}>
        <View style={[styles.fill, { width: share(satisfied), backgroundColor: '#16A34A' }]} />
        <View style={[styles.fill, { width: share(pending), backgroundColor: '#F59E0B' }]} />
        <View style={[styles.fill, { width: share(actionNeeded), backgroundColor: '#DC2626' }]} />
      </View>

      <View style={styles.stats}>
        <Stat value={actionNeeded} label={actionNeeded === 1 ? 'needs you' : 'need you'} tint="#DC2626" />
        <View style={styles.statLine} />
        <Stat value={pending} label="with HR" tint="#B45309" />
        <View style={styles.statLine} />
        <Stat value={satisfied} label="in order" tint="#15803D" />
      </View>
    </View>
  );
};

const Stat: React.FC<{ value: number; label: string; tint: string }> = ({ value, label, tint }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Notice ────────────────────────────────────────────────────────────

/**
 * The server's own words for why uploading is closed. Shown once at the top
 * rather than as a failure at submit time — the difference between knowing and
 * finding out after choosing a file.
 */
export const NoticeBanner: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.notice}>
    <MaterialCommunityIcons name="lock-outline" size={20} color="#B45309" />
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

export const DocumentRowItem: React.FC<{
  row: DocumentRow;
  onPress: () => void;
  last?: boolean;
}> = ({ row, onPress, last = false }) => {
  const look = lookOf(row.status);

  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${row.name}. ${look.label}. ${rowMeta(row)}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: look.bg }]}>
        <MaterialCommunityIcons name={look.icon} size={22} color={look.fg} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle} numberOfLines={1}>{row.name}</Text>
          {/* A waived row is also "not required", but saying so here would blur a
              decision HR made about this person with a property of the type. */}
          {!row.isRequired && row.status !== 'WAIVED' ? <Text style={styles.rowOptional}>Optional</Text> : null}
        </View>
        <Text style={[styles.rowMeta, { color: look.group === 'action' ? look.fg : C.body }]} numberOfLines={1}>
          {rowMeta(row)}
        </Text>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
    </TouchableOpacity>
  );
};

// ── One document ──────────────────────────────────────────────────────

/**
 * Everything about one document, on its own surface.
 *
 * It is a sheet and not a section on the list because the list answers "what do
 * I still owe" and this answers "what do I do about this one". Putting HR's
 * instructions, the rejection reason and three buttons inline would turn eleven
 * scannable rows into eleven paragraphs.
 */
export const DocumentSheet: React.FC<{
  row: DocumentRow | null;
  canUpload: boolean;
  uploading: boolean;
  onClose: () => void;
  onUpload: () => void;
  onDownload: () => void;
  onTemplate: () => void;
}> = ({ row, canUpload, uploading, onClose, onUpload, onDownload, onTemplate }) => {
  if (!row) return null;

  const look = lookOf(row.status);
  const doc = row.document;
  const uploadable = row.employeeCanUpload && canUpload;
  const resend = row.status === 'REJECTED' || row.status === 'EXPIRED' || row.status === 'EXPIRING' || row.status === 'OK';

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
            <View style={styles.sheetHead}>
              <View style={[styles.sheetIcon, { backgroundColor: look.bg }]}>
                <MaterialCommunityIcons name={look.icon} size={24} color={look.fg} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.sheetTitle}>{row.name}</Text>
                <View style={[styles.pill, { backgroundColor: look.bg }]}>
                  <Text style={[styles.pillText, { color: look.fg }]}>{look.label}</Text>
                </View>
              </View>
            </View>

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

            {row.employeeInstructions ? (
              <View style={styles.instructions}>
                <MaterialCommunityIcons name="information-outline" size={18} color={C.blue} />
                <Text style={styles.instructionsText}>{row.employeeInstructions}</Text>
              </View>
            ) : null}

            {!row.employeeCanUpload ? (
              <View style={styles.instructions}>
                <MaterialCommunityIcons name="account-tie-outline" size={18} color={C.blue} />
                <Text style={styles.instructionsText}>
                  HR issues this document. You can download your copy, but you cannot upload one.
                </Text>
              </View>
            ) : null}

            <View style={styles.facts}>
              {row.dueDate ? <Fact label="Due" value={plainDate(row.dueDate)} /> : null}
              {doc ? <Fact label="File" value={doc.fileName} /> : null}
              {doc?.fileSizeKb ? <Fact label="Size" value={formatBytes(doc.fileSizeKb * 1024)} /> : null}
              {doc ? <Fact label="Sent" value={shortDate(doc.uploadedAt)} /> : null}
              {doc?.verifiedAt ? (
                <Fact label="Checked by" value={`${doc.verifiedByName ?? 'HR'} · ${shortDate(doc.verifiedAt)}`} />
              ) : null}
              {doc?.expiryDate ? <Fact label="Expires" value={plainDate(doc.expiryDate)} /> : null}
            </View>

            <View style={styles.actions}>
              {uploadable ? (
                <PrimaryButton
                  icon="tray-arrow-up"
                  label={resend ? 'Send a new copy' : 'Send this document'}
                  onPress={onUpload}
                  loading={uploading}
                />
              ) : null}
              {doc ? (
                <PrimaryButton icon="tray-arrow-down" label="Download my copy" onPress={onDownload} variant="outline" />
              ) : null}
              {row.hasTemplate ? (
                <PrimaryButton
                  icon="file-document-outline"
                  label="Get the blank form"
                  onPress={onTemplate}
                  variant="outline"
                />
              ) : null}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.sheetClose} onPress={onClose} accessibilityRole="button">
            <Text style={styles.sheetCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.fact}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue} numberOfLines={2}>{value}</Text>
  </View>
);

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

export const Busy: React.FC = () => (
  <View style={styles.busy}>
    <ActivityIndicator color={C.blue} />
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },

  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  summaryHeadline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  summaryPercent: { fontSize: 34, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  summaryPercentLabel: { fontSize: 14, color: C.body },
  summaryCount: { fontSize: 13, color: C.muted },

  track: { flexDirection: 'row', height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden', marginTop: 14 },
  fill: { height: 8 },

  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statLine: { width: 1, height: 30, backgroundColor: C.line },
  statValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: C.body, marginTop: 2 },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#FCE4BE',
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#8A5A16' },

  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  heading: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.8 },
  headingCount: { fontSize: 12, fontWeight: '800', color: C.muted },

  panel: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  rowOptional: { fontSize: 11, color: C.muted },
  rowMeta: { fontSize: 12 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    maxHeight: '86%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 14 },
  sheetScroll: { paddingBottom: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: C.ink },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 5 },
  pillText: { fontSize: 12, fontWeight: '700' },

  reasonBox: { backgroundColor: C.dangerBg, borderRadius: 14, padding: 14, marginTop: 16 },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 4 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.ink },

  quietBox: { backgroundColor: C.field, borderRadius: 14, padding: 14, marginTop: 16 },
  quietText: { fontSize: 14, lineHeight: 20, color: C.body },

  instructions: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  instructionsText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.body },

  facts: { marginTop: 16, borderTopWidth: 1, borderTopColor: C.line },
  fact: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  factLabel: { fontSize: 13, color: C.body },
  factValue: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink, textAlign: 'right' },

  actions: { marginTop: 18, gap: 10 },

  sheetClose: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  sheetCloseText: { fontSize: 15, fontWeight: '700', color: C.body },

  pickSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  pickTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  pickHint: { fontSize: 12, color: C.muted, marginTop: 2, marginBottom: 6 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  pickIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  pickRowTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  pickRowHint: { fontSize: 12, color: C.body, marginTop: 2 },

  state: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F0FE', alignItems: 'center', justifyContent: 'center' },
  stateIconDanger: { backgroundColor: C.dangerBg },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12, textAlign: 'center' },
  stateBody: { fontSize: 13, color: C.body, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  retry: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: C.blue },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  busy: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
});

/**
 * Where the file comes from.
 *
 * Its own sheet rather than the requests one because the hints have to name what
 * the compliance validator actually accepts — a person told "PDF, Word or Excel"
 * will pick a .docx and have it refused after the upload.
 */
export const SourceSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPick: (source: PickSource) => void;
}> = ({ visible, onClose, onPick }) => {
  const options: { key: PickSource; icon: IconName; title: string; hint: string }[] = [
    { key: 'camera', icon: 'camera-outline', title: 'Take a photo', hint: 'Best for a card or a certificate' },
    { key: 'library', icon: 'image-outline', title: 'Choose a photo', hint: 'JPEG or PNG from your gallery' },
    { key: 'document', icon: 'file-pdf-box', title: 'Choose a PDF', hint: 'A scan or a statement you downloaded' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={styles.pickSheet}>
          <Text style={styles.pickTitle}>Send a document</Text>
          <Text style={styles.pickHint}>Up to {formatBytes(MAX_FILE_BYTES)}</Text>
          {options.map((o, index) => (
            <TouchableOpacity
              key={o.key}
              style={[styles.pickRow, index < options.length - 1 && styles.rowDivider]}
              onPress={() => onPick(o.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <View style={styles.pickIcon}>
                <MaterialCommunityIcons name={o.icon} size={22} color={C.blue} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.pickRowTitle}>{o.title}</Text>
                <Text style={styles.pickRowHint}>{o.hint}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.sheetClose} onPress={onClose} accessibilityRole="button">
            <Text style={styles.sheetCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/** The white card a group of rows sits on. */
export const DocumentPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.panel}>{children}</View>
);
