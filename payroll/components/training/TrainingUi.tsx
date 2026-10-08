/**
 * The pieces the My Training screen is built from.
 *
 * Deliberately built on components/documents/DocumentUi: a training checklist
 * asks the same question a document checklist does -- what is required of me,
 * what have I done, what is my problem right now -- so it uses the same summary
 * card, group heading, list panel, status row and bottom sheet, imported rather
 * than copied, so the two screens cannot drift apart again.
 *
 * The status vocabulary is the server's: seven tokens defined once in
 * TrainingStatus and mirrored here. Each one gets its own icon as well as its
 * own colour, because "red means act, green means done" is invisible to a
 * colour-blind reader and to anyone glancing at a phone in daylight. The shape
 * carries the meaning; the colour only reinforces it.
 *
 * Rows are grouped rather than listed flat, and the grouping is not a straight
 * status lookup. EXPIRING sits under COMING UP and not under "needs you": a
 * certificate valid for another six weeks is not something to act on today, and
 * putting it in the same pile as a course never taken would bury the one that
 * matters. And an optional course that has lapsed is not the employee's
 * problem at all.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import PrimaryButton, { type IconName } from '../auth/PrimaryButton';
import { plainDate } from '../requests/RequestUi';
import {
  BottomSheet,
  Fact,
  FactList,
  GroupHeading,
  ListPanel,
  ProgressSummary,
  SheetHead,
  SheetNote,
  StatusRow,
  type SheetNoteValue,
} from '../documents/DocumentUi';
import type { TrainingRow, TrainingStatus } from '../../api/services/trainingService';

export { GroupHeading };

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

/**
 * Where the row belongs. The server resolves an optional course with a lapsed
 * record to EXPIRED as well, and putting that in red under NEEDS YOUR
 * ATTENTION, with "retake it", chased the employee for something not required
 * of them.
 */
export function groupOf(row: TrainingRow): TrainingGroup {
  if (row.status === 'EXPIRED' && !row.isRequired) return 'notRequired';
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
      if (!row.isRequired) return 'Expired · optional';
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
      // The server sends no due-by date yet (join date + grace days), so this
      // cannot say when. See the backend note on EmployeeTrainingRowDto.
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
 * How far along, in one short card. The bar is segmented so "coming up" is
 * visible as its own slice -- it is neither done nor overdue, and a plain
 * percentage hides the difference. The slices are counted from the required
 * rows the list shows (the server's own counts include optional courses), so
 * they add up to the "x of y" beside them.
 */
export const TrainingSummary: React.FC<{
  percent: number;
  required: number;
  /** Required courses done, the expiring ones included — they are valid today. */
  done: number;
  /** Required courses that are expiring or due soon. */
  comingUp: number;
  /** Of `comingUp`, the ones already counted in `done`. */
  expiring: number;
  actionNeeded: number;
}> = ({ percent, required, done, comingUp, expiring, actionNeeded }) => (
  <ProgressSummary
    percent={percent}
    caption={`${done} of ${required} completed`}
    total={required}
    segments={[
      { value: Math.max(0, done - expiring), color: '#16A34A' },
      { value: comingUp, color: '#F59E0B' },
      { value: actionNeeded, color: '#DC2626' },
    ]}
  />
);

// ── List ──────────────────────────────────────────────────────────────

/** The white card a group of rows sits on. */
export const TrainingPanel = ListPanel;

export const TrainingRowItem: React.FC<{
  row: TrainingRow;
  onPress: () => void;
  last?: boolean;
}> = ({ row, onPress, last = false }) => {
  const look = lookOf(row.status);
  const meta = rowMeta(row);
  return (
    <StatusRow
      icon={look.icon}
      fg={look.fg}
      bg={look.bg}
      title={row.name}
      meta={meta}
      urgent={groupOf(row) === 'action'}
      // An excused row is also "not required", but saying so here would blur a
      // decision HR made about this person with a property of the course.
      optional={!row.isRequired && row.status !== 'EXCUSED'}
      badge={row.sessionHasProof ? 'clipboard-check-outline' : undefined}
      onPress={onPress}
      last={last}
      accessibilityLabel={`${row.name}. ${look.label}. ${meta}${row.sessionHasProof ? '. Attendance record on file' : ''}`}
    />
  );
};

// ── One training ──────────────────────────────────────────────────────

/**
 * Everything about one course, on its own surface: who ran it, when it was
 * taken, when it lapses, and whether there is a record to open.
 *
 * The file behind "Open attendance record" is the session's signed attendance
 * sheet -- the server has no per-person certificate -- so the button says what
 * it opens rather than promising a certificate and handing over a sign-in list.
 */
export const TrainingSheet: React.FC<{
  row: TrainingRow | null;
  opening: boolean;
  note: SheetNoteValue | null;
  onClose: () => void;
  onCertificate: () => void;
}> = ({ row, opening, note, onClose, onCertificate }) => {
  if (!row) return null;

  const look = lookOf(row.status);
  // Nothing on this screen books a place: training is arranged by HR, so an
  // employee who has to act needs to know who to act on.
  const needsSession =
    row.isRequired && (row.status === 'EXPIRED' || row.status === 'NOT_DONE' || row.status === 'DUE_SOON');
  const taken = row.status === 'DONE' || row.status === 'EXPIRING' || row.status === 'EXPIRED';

  return (
    <BottomSheet onDismiss={onClose} footerLabel="Close" onFooter={onClose}>
      <SheetHead icon={look.icon} fg={look.fg} bg={look.bg} title={row.name} label={look.label} />

      <FactList>
        {row.status === 'EXCUSED' && row.excusedReason ? <Fact label="Excused" value={row.excusedReason} /> : null}
        <Fact label="Code" value={row.code} />
        {row.category ? <Fact label="Category" value={prettyCategory(row.category)} /> : null}
        <Fact label="Required" value={row.isRequired ? 'Yes, for your role' : 'Optional'} />
        {needsSession ? <Fact label="Next session" value="Ask HR" /> : null}
        {row.completedOn ? <Fact label="Completed" value={plainDate(row.completedOn)} /> : null}
        {row.expiresOn ? <Fact label="Valid until" value={plainDate(row.expiresOn)} /> : null}
        {row.trainer ? <Fact label="Trainer" value={row.trainer} /> : null}
        {row.evidenceSource ? <Fact label="Recorded as" value={prettySource(row.evidenceSource)} /> : null}
        {taken && !row.sessionHasProof ? <Fact label="Attendance record" value="Not filed" /> : null}
      </FactList>

      {note ? <SheetNote tone={note.tone} text={note.text} /> : null}

      {row.sessionHasProof ? (
        <View style={styles.actions}>
          <PrimaryButton
            icon="clipboard-text-outline"
            label="Open attendance record"
            onPress={onCertificate}
            variant="outline"
            loading={opening}
            compact
          />
        </View>
      ) : null}
    </BottomSheet>
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

const styles = StyleSheet.create({
  actions: { marginTop: 14, gap: 10 },
});
