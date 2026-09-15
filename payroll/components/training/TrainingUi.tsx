/**
 * The pieces the My Training screen is built from.
 *
 * Deliberately the sibling of components/documents/DocumentUi: a training
 * checklist asks the same question a document checklist does -- what is
 * required of me, what have I done, what is my problem right now -- so it
 * should not answer it in a different visual language. Same summary card, same
 * grouped rows, same sheet.
 *
 * The status vocabulary is the server's: seven tokens defined once in
 * TrainingStatus and mirrored here. Each one gets its own icon as well as its
 * own colour, because "red means act, green means done" is invisible to a
 * colour-blind reader and to anyone glancing at a phone in daylight. The shape
 * carries the meaning; the colour only reinforces it.
 *
 * Rows are grouped rather than listed flat, and the grouping is not a straight
 * status lookup. EXPIRING sits under DONE and not under "needs you": a
 * certificate valid for another six weeks is not something to act on today, and
 * putting it in the same pile as a course never taken would bury the one that
 * matters.
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import PrimaryButton, { type IconName } from '../auth/PrimaryButton';
import { plainDate } from '../requests/RequestUi';
import type { TrainingRow, TrainingStatus } from '../../api/services/trainingService';

// ── Status ────────────────────────────────────────────────────────────

/** Which pile a row belongs in. The order is the order the sections appear. */
export type TrainingGroup = 'action' | 'soon' | 'done' | 'notRequired';

interface StatusLook {
  label: string;
  icon: IconName;
  fg: string;
  bg: string;
  group: TrainingGroup;
}

export const STATUS_LOOK: Record<TrainingStatus, StatusLook> = {
  EXPIRED: { label: 'Expired', icon: 'calendar-remove-outline', fg: '#B91C1C', bg: '#FEE2E2', group: 'action' },
  NOT_DONE: { label: 'Not done', icon: 'alert-circle-outline', fg: '#B91C1C', bg: '#FEE2E2', group: 'action' },
  DUE_SOON: { label: 'Due soon', icon: 'clock-alert-outline', fg: '#B45309', bg: '#FFF4E5', group: 'soon' },
  EXPIRING: { label: 'Expiring', icon: 'calendar-clock-outline', fg: '#B45309', bg: '#FFF4E5', group: 'soon' },
  DONE: { label: 'Done', icon: 'check-circle-outline', fg: '#15803D', bg: '#DCFCE7', group: 'done' },
  EXCUSED: { label: 'Excused', icon: 'minus-circle-outline', fg: '#64748B', bg: '#EEF2F7', group: 'notRequired' },
  'N/A': { label: 'Optional', icon: 'circle-outline', fg: '#64748B', bg: '#EEF2F7', group: 'notRequired' },
};

export function lookOf(status: string): StatusLook {
  return STATUS_LOOK[status as TrainingStatus] ?? STATUS_LOOK['N/A'];
}

export function groupOf(row: TrainingRow): TrainingGroup {
  return lookOf(row.status).group;
}

export const GROUP_TITLE: Record<TrainingGroup, string> = {
  action: 'NEEDS YOUR ATTENTION',
  soon: 'COMING UP',
  done: 'COMPLETED',
  notRequired: 'NOT REQUIRED',
};

/** Whole days from today to a plain YYYY-MM-DD, negative once it is past. */
function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const then = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((then.getTime() - midnight.getTime()) / 86400000);
}

/** One line under the course name: the fact that explains its state. */
export function rowMeta(row: TrainingRow): string {
  switch (row.status) {
    case 'EXPIRED': {
      const days = daysUntil(row.expiresOn);
      if (days !== null && days < 0) {
        const n = Math.abs(days);
        return `Expired ${n} ${n === 1 ? 'day' : 'days'} ago · retake it`;
      }
      return row.expiresOn ? `Expired ${plainDate(row.expiresOn)} · retake it` : 'Expired · retake it';
    }
    case 'EXPIRING': {
      const days = daysUntil(row.expiresOn);
      return days !== null
        ? `Expires in ${days} ${days === 1 ? 'day' : 'days'}`
        : `Expires ${plainDate(row.expiresOn)}`;
    }
    case 'DUE_SOON':
      return 'Due soon · not taken yet';
    case 'NOT_DONE':
      return 'You have not taken this yet';
    case 'DONE':
      return row.expiresOn
        ? `Completed ${plainDate(row.completedOn)} · valid to ${plainDate(row.expiresOn)}`
        : `Completed ${plainDate(row.completedOn)}`;
    case 'EXCUSED':
      return row.excusedReason || 'Excused for you';
    default:
      return row.isRequired ? 'Required of your role' : 'Take it if you want to';
  }
}

// ── Summary ───────────────────────────────────────────────────────────

/**
 * The whole picture in one card: how far along, and the two numbers that say
 * whether anything is your problem today. The bar is segmented rather than a
 * single fill so "expiring" is visible as its own slice -- it is neither done
 * nor overdue, and a plain percentage hides the difference.
 */
export const TrainingSummary: React.FC<{
  percent: number;
  required: number;
  done: number;
  expiring: number;
  actionNeeded: number;
}> = ({ percent, required, done, expiring, actionNeeded }) => {
  const total = Math.max(required, 1);
  // Typed as a percentage literal, not a plain string: a style width will not
  // accept `string`, and widening it with a cast would hide the next mistake.
  const share = (n: number): `${number}%` => `${Math.min(100, (n / total) * 100)}%`;

  // "done" already counts the expiring ones -- they are complete until the day
  // they are not -- so the green slice is drawn without them to keep the bar
  // adding up to the same total the counts do.
  const solid = Math.max(0, done - expiring);

  return (
    <View style={styles.summary}>
      <View style={styles.summaryTop}>
        <View style={styles.summaryHeadline}>
          <Text style={styles.summaryPercent}>{percent}%</Text>
          <Text style={styles.summaryPercentLabel}>complete</Text>
        </View>
        <Text style={styles.summaryCount}>
          {done} of {required} trainings
        </Text>
      </View>

      <View style={styles.track} accessibilityLabel={`${percent} percent complete`}>
        <View style={[styles.fill, { width: share(solid), backgroundColor: '#16A34A' }]} />
        <View style={[styles.fill, { width: share(expiring), backgroundColor: '#F59E0B' }]} />
        <View style={[styles.fill, { width: share(actionNeeded), backgroundColor: '#DC2626' }]} />
      </View>

      <View style={styles.stats}>
        <Stat value={actionNeeded} label={actionNeeded === 1 ? 'needs you' : 'need you'} tint="#DC2626" />
        <View style={styles.statLine} />
        <Stat value={expiring} label="expiring" tint="#B45309" />
        <View style={styles.statLine} />
        <Stat value={done} label="completed" tint="#15803D" />
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

// ── List ──────────────────────────────────────────────────────────────

export const GroupHeading: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <View style={styles.headingRow}>
    <Text style={styles.heading}>{title}</Text>
    <Text style={styles.headingCount}>{count}</Text>
  </View>
);

/** The white card a group of rows sits on. */
export const TrainingPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.panel}>{children}</View>
);

export const TrainingRowItem: React.FC<{
  row: TrainingRow;
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
          {/* An excused row is also "not required", but saying so here would blur
              a decision HR made about this person with a property of the course. */}
          {!row.isRequired && row.status !== 'EXCUSED' ? <Text style={styles.rowOptional}>Optional</Text> : null}
        </View>
        <Text style={[styles.rowMeta, { color: look.group === 'action' ? look.fg : C.body }]} numberOfLines={1}>
          {rowMeta(row)}
        </Text>
      </View>

      {row.sessionHasProof ? (
        <MaterialCommunityIcons name="certificate-outline" size={18} color={C.muted} style={styles.rowBadge} />
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
    </TouchableOpacity>
  );
};

// ── One training ──────────────────────────────────────────────────────

/**
 * Everything about one course, on its own surface.
 *
 * A sheet rather than an expanding row because the list answers "what do I
 * still owe" and this answers "what is the story with this one" -- who ran it,
 * when it was taken, when it lapses, and whether there is a certificate to
 * open. Inlining that would turn a dozen scannable rows into a dozen
 * paragraphs.
 */
export const TrainingSheet: React.FC<{
  row: TrainingRow | null;
  opening: boolean;
  onClose: () => void;
  onCertificate: () => void;
}> = ({ row, opening, onClose, onCertificate }) => {
  if (!row) return null;

  const look = lookOf(row.status);
  const overdue = row.status === 'EXPIRED' || row.status === 'NOT_DONE' || row.status === 'DUE_SOON';

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

            {row.status === 'EXCUSED' && row.excusedReason ? (
              <View style={styles.quietBox}>
                <Text style={styles.quietText}>{row.excusedReason}</Text>
              </View>
            ) : null}

            {/* Nothing on this screen books a place: training is arranged by HR,
                so an employee told to "act" needs to know who to act on. */}
            {overdue ? (
              <View style={styles.instructions}>
                <MaterialCommunityIcons name="account-tie-outline" size={18} color={C.blue} />
                <Text style={styles.instructionsText}>
                  Sessions are arranged by HR. Ask them when this course is next running.
                </Text>
              </View>
            ) : null}

            <View style={styles.facts}>
              <Fact label="Code" value={row.code} />
              {row.category ? <Fact label="Category" value={prettyCategory(row.category)} /> : null}
              <Fact label="Required" value={row.isRequired ? 'Yes, for your role' : 'Optional'} />
              {row.completedOn ? <Fact label="Completed" value={plainDate(row.completedOn)} /> : null}
              {row.expiresOn ? <Fact label="Valid until" value={plainDate(row.expiresOn)} /> : null}
              {row.trainer ? <Fact label="Trainer" value={row.trainer} /> : null}
              {row.evidenceSource ? <Fact label="Recorded as" value={prettySource(row.evidenceSource)} /> : null}
            </View>

            {row.sessionHasProof ? (
              <View style={styles.actions}>
                <PrimaryButton
                  icon="certificate-outline"
                  label="Open my certificate"
                  onPress={onCertificate}
                  loading={opening}
                />
              </View>
            ) : row.status === 'DONE' || row.status === 'EXPIRING' || row.status === 'EXPIRED' ? (
              <View style={styles.instructions}>
                <MaterialCommunityIcons name="file-hidden" size={18} color={C.muted} />
                <Text style={styles.instructionsText}>
                  No certificate was filed for this one. HR still has it on your record.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity style={styles.sheetClose} onPress={onClose} accessibilityRole="button">
            <Text style={styles.sheetCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/** SOFT_SKILLS reads as shouting; the server's token is for the server. */
function prettyCategory(value: string): string {
  const words = value.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function prettySource(value: string): string {
  return value === 'SESSION' ? 'A training session' : 'Entered by HR';
}

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.fact}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue} numberOfLines={2}>{value}</Text>
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
  rowBadge: { marginRight: -4 },

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
});
