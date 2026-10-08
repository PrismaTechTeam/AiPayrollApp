/**
 * One leave application, and what can still be done about it.
 *
 * Three readers on one page. The employee sees what they asked for, where it
 * has got to, and the way to take it back. Whoever may decide it — the approver
 * of the step that is waiting, or HR, who decides on that approver's behalf —
 * sees approve and reject. Nobody sees them on their own leave: the server
 * refuses it, and a button that can only fail is worse than no button.
 *
 * For the person deciding, the page leads with WHO (name, code, department),
 * then what and when, then the facts a decision rests on — when it was applied
 * for, what balance is left, who else in the department is off, who it waits
 * on, the file — then the reason and the whole trail from submission. It used
 * to lead with the leave type and end at 40% of the screen, with the person a
 * truncated icon line.
 *
 * "Mine" is worked out from the leave itself (is it the reader's own?) rather
 * than from how the page was opened, so HR opening their own leave from the
 * queue keeps Withdraw and Cancel, and an approver opening one from a
 * notification is not treated as its owner.
 *
 * The decision sits in a footer outside the scroll, so Approve and Reject are
 * on screen however long the reason and the approval trail run.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import type { IconName } from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { useDepartmentApprover } from '../hooks/useDepartmentApprover';
import { STATUSES } from '../constants/statuses';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { serverMessage } from '../lib/serverMessage';
import { openAttachment } from '../lib/downloadAttachment';
import {
  pickFile,
  rejectionReason,
  iconForFile,
  type PickSource,
} from '../lib/requestAttachments';
import { AttachButton, PickSourceSheet, dateAndTime, shortDate } from '../components/requests/RequestUi';
import {
  DangerOutlineButton,
  DecisionButtons,
  FormCard,
  LEAVE_CARD,
  LeaveHeader,
  LeaveState,
  LeaveStatusPill,
  approveConfirmText,
  dateRangeText,
  dayText,
  daysSince,
  decisionFailure,
  decisionOutcome,
  decisionsRefused,
  handOffNotice,
  leaveLength,
  leaveTint,
  personInitials,
  rejectPrompt,
  todayInMalaysia,
  trySharedToast,
} from '../components/leave/LeaveUi';

type Params = {
  LeaveDetails: {
    leaveId?: string;
    /** Kept for older call sites that passed the whole row instead of an id. */
    leave?: { id?: string; _raw?: { id?: string } };
    /** Opened from the approval queue: HR reads through the web API first. */
    canApprove?: boolean;
  };
};

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; leave: LeaveApplication }
  | { kind: 'failed'; message: string };

type Acting = 'approve' | 'reject' | 'withdraw' | 'cancel' | 'hrCancel' | null;

/** The decision facts that come from other reads; each line is simply left out when its read fails. */
type Extra = { balance: string | null; alsoOff: string | null };
const NO_EXTRA: Extra = { balance: null, alsoOff: null };

type Look = { colour: string; icon: IconName };

const STEP_LOOK: Record<string, Look> = {
  APPROVED: { colour: '#15803D', icon: 'check' },
  REJECTED: { colour: '#B91C1C', icon: 'close' },
  PENDING: { colour: '#B45309', icon: 'clock-outline' },
};

/** Submission is always the first node: done, and neutral rather than a verdict colour. */
const SUBMITTED: Look = { colour: C.body, icon: 'send' };

/**
 * A step the leave never reached. The server leaves the later steps PENDING
 * when a leave is rejected, withdrawn or cancelled, and drawing those with the
 * amber clock made a closed leave look as if it were still waiting on someone.
 */
const NOT_REACHED: Look = { colour: C.muted, icon: 'minus' };

type TimelineNode = { key: string; title: string; meta: string; note?: string | null; look: Look };

type Fact = { label: string; value: string; onPress?: () => void; icon?: IconName };

export const LeaveDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'LeaveDetails'>>();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { user, employee } = usePayrollAuth();
  const myId = user?.employeeId ?? employee?.id ?? null;

  const { leaveId, leave: legacy, canApprove = false } = route.params ?? {};
  const id = leaveId ?? legacy?._raw?.id ?? legacy?.id ?? null;

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sourceSheet, setSourceSheet] = useState(false);
  const [extra, setExtra] = useState<Extra>(NO_EXTRA);
  // Leave waiting on the reader by a role step. The mobile list counts role
  // steps as theirs, so without this the card offered Approve and the page the
  // same card opened did not.
  const [myQueue, setMyQueue] = useState<ReadonlySet<string>>(() => new Set());
  // Which action is working, and the guard that stops a second tap queueing a
  // second confirm (the dialog queues): it is set before the dialog opens.
  const [acting, setActing] = useState<Acting>(null);
  const actingRef = useRef(false);

  // Nothing is read until the approval right is known: the first answer is a
  // role-name guess and picks the wrong API for an HR role that is not Owner.
  const access = useApproverAccess();
  const leaveApprover = access.leave;
  // Without a user and company the rights are never asked for; the guess is all there is.
  const accessKnown = access.ready || access.failed || !(user?.uid && user?.tenantId);
  const { departmentIds } = useDepartmentApprover();

  const loadRef = useRef(load);
  loadRef.current = load;
  // The approval right can change which API is read; only the newest read may write.
  const seq = useRef(0);

  /**
   * HR and owners read through the web API, which has no employee-level check;
   * employees and approvers read through the mobile one, which does. Whichever
   * is tried first, someone holding the approval right falls back to the other:
   * HR with no employee record cannot use the mobile read, and HR opening their
   * own leave from a notification may not hold the web VIEW right.
   */
  const read = useCallback(async (leaveKey: string): Promise<LeaveApplication> => {
    const viaHr = () => leaveService.getApplicationByIdAsHR(leaveKey);
    const viaMobile = () => leaveService.getApplicationById(leaveKey);
    const [first, second] = leaveApprover && canApprove ? [viaHr, viaMobile] : [viaMobile, viaHr];
    try {
      return await first();
    } catch (err) {
      if (!leaveApprover) throw err;
      try {
        return await second();
      } catch {
        throw err;
      }
    }
  }, [leaveApprover, canApprove]);

  /**
   * The facts a decision rests on that the leave itself does not carry: the
   * employee's balance for this type, and who in the same department is off
   * on those dates. Both are HR's web reads with rights of their own, so a
   * 403, an error or no matching row leaves the line out — never a 0.
   */
  const readExtras = useCallback((item: LeaveApplication, mine: number) => {
    const own = myId !== null && item.employeeId === myId;
    if (own || (item.status ?? '').toUpperCase() !== STATUSES.PENDING) {
      setExtra(NO_EXTRA);
      return;
    }
    if (!leaveApprover) {
      leaveService
        .getPendingApprovals({ page: 1, pageSize: 200 })
        .then((r) => { if (mine === seq.current) setMyQueue(new Set(r.items.map((l) => l.id))); })
        .catch(() => undefined);
      return;
    }

    const year = Number((item.startDate ?? '').slice(0, 4));
    const balance: Promise<string | null> = year > 0 && item.employeeId
      ? leaveService
        .getEmployeeBalances(item.employeeId, year)
        .then((rows) => {
          const row = rows.find((r) => r.leaveTypeId === item.leaveTypeId);
          return row ? `${dayText(row.balanceDays)} left · this leave ${leaveLength(item)}` : null;
        })
        .catch(() => null)
      : Promise.resolve(null);

    const department = (item.employeeDepartment ?? '').trim().toLowerCase();
    const start = (item.startDate ?? '').slice(0, 10);
    const end = (item.endDate ?? '').slice(0, 10) || start;
    // Without the applicant's department there is no honest "also off": the
    // whole company's leave would bury the one name that matters.
    const alsoOff: Promise<string | null> = department && start
      ? leaveService
        .getLeaveOverlap(start, end)
        .then((rows) => {
          const names = Array.from(new Set(
            rows
              .filter((r) => r.employeeId !== item.employeeId && (r.department ?? '').trim().toLowerCase() === department)
              .map((r) => r.employeeName.trim())
              .filter(Boolean),
          ));
          if (names.length === 0) return null;
          return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
        })
        .catch(() => null)
      : Promise.resolve(null);

    void Promise.all([balance, alsoOff]).then(([b, a]) => {
      if (mine === seq.current) setExtra({ balance: b, alsoOff: a });
    });
  }, [myId, leaveApprover]);

  const show = useCallback(async (quiet: boolean) => {
    const mine = ++seq.current;
    if (!id) {
      setLoad({ kind: 'failed', message: 'This leave could not be opened. Go back and try again.' });
      return;
    }
    if (!quiet) {
      setLoad({ kind: 'loading' });
      setExtra(NO_EXTRA);
    }
    try {
      const leave = await read(id);
      if (mine !== seq.current) return;
      setLoad({ kind: 'ready', leave });
      readExtras(leave, mine);
    } catch (err) {
      if (mine !== seq.current) return;
      // A quiet re-read that fails keeps the leave already on screen.
      if (!quiet || loadRef.current.kind !== 'ready') {
        setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load this leave.') });
      }
    }
  }, [id, read, readExtras]);

  // Coming back refreshes in place instead of blanking to a spinner.
  useFocusEffect(
    useCallback(() => {
      if (!accessKnown) return;
      void show(loadRef.current.kind === 'ready');
    }, [show, accessKnown]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await show(true);
    setRefreshing(false);
  };

  const leave = load.kind === 'ready' ? load.leave : null;
  const self = leave !== null && myId !== null && leave.employeeId === myId;
  const pending = leave?.status === STATUSES.PENDING;
  const open = pending || leave?.status === STATUSES.DRAFT;

  /** The step that is actually waiting. */
  const waitingStep = leave && pending
    ? leave.approvals?.find((a) => a.stepOrder === leave.currentApprovalStep && a.status === STATUSES.PENDING)
    : undefined;

  /** The waiting step is the reader's: by name, by a department they approve for, or in their own queue. */
  const stepIsMine = leave !== null && pending && (
    (waitingStep != null && waitingStep.approverId != null && waitingStep.approverId === myId)
    || (waitingStep != null
      && waitingStep.approverId == null
      && waitingStep.approverDepartmentId != null
      && departmentIds.includes(waitingStep.approverDepartmentId))
    || myQueue.has(leave.id)
  );

  /**
   * Who may decide: never the applicant; the approver the step is waiting on;
   * and HR on any waiting step (on that approver's behalf when it is not
   * theirs — a deliberate rule) or on a leave type with no approver set up,
   * which the server leaves to HR alone.
   */
  const mayDecide = leave !== null && !self && pending && (
    stepIsMine
    || (leaveApprover && (waitingStep != null || leave.totalApprovalSteps === 0))
  );
  // HR without an employee record, once the live server has refused that
  // account: the buttons could only fail, so the footer says where to decide.
  const refusedHere = mayDecide && myId === null && decisionsRefused();
  const isDecider = mayDecide && !refusedHere;

  /**
   * Whether an approved leave can still be taken back.
   *
   * The server refuses to cancel a leave whose period has already ended — those
   * days may have been paid already, and HR adjusts them by hand. Today is the
   * Malaysian date, the one the server's company clock uses, whatever zone the
   * phone is in. An empty end date sorts before any real date and so hides it.
   */
  const endKey = (leave?.endDate ?? '').slice(0, 10);
  const stillRunning = leave?.status === STATUSES.APPROVED && endKey >= todayInMalaysia();
  const canCancel = self && stillRunning;
  const canWithdraw = self && pending;
  // HR taking back an employee's approved leave, e.g. they came back early.
  const canHrCancel = !self && leaveApprover && stillRunning;

  // ── Actions ─────────────────────────────────────────────────────────

  /** File work: one at a time, with the server's own words on failure. */
  const run = async (work: () => Promise<void>, failure: string) => {
    setBusy(true);
    try {
      await work();
    } catch (err) {
      await dialog.notify({ title: failure, message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  /**
   * One decision or undo: ask, then do. A second tap while the question is open
   * does nothing, because the guard is set before the dialog appears.
   */
  const guarded = async (
    kind: Exclude<Acting, null>,
    ask: () => Promise<string | boolean | null>,
    work: (answer: string) => Promise<void>,
    failure: string,
    explain: (err: unknown) => string = (err) => serverMessage(err, 'Please try again.'),
  ) => {
    if (actingRef.current) return;
    actingRef.current = true;
    try {
      const answer = await ask();
      if (!answer) return;
      setActing(kind);
      await work(typeof answer === 'string' ? answer : '');
    } catch (err) {
      await dialog.notify({ title: failure, message: explain(err), tone: 'danger' });
    } finally {
      actingRef.current = false;
      setActing(null);
    }
  };

  /**
   * Done: say so without a box to dismiss, and go back. The shared toast lives
   * above the navigator, so it stays up on whatever page the approver lands on.
   * The hand-off and the short box below are for a dialog without a toast.
   */
  const done = async (title: string, message?: string) => {
    if (trySharedToast(dialog, title)) {
      navigation.goBack();
      return;
    }
    const state = navigation.getState();
    const previous = state?.routes?.[state.index - 1]?.name;
    if (previous === 'Leaves') {
      handOffNotice(title);
      navigation.goBack();
      return;
    }
    await dialog.notify({ title, message, tone: 'success' });
    navigation.goBack();
  };

  const explainDecision = (err: unknown) => decisionFailure(err, myId !== null);

  const approve = (item: LeaveApplication) => {
    // Facts only: whether approving finishes the leave or passes it on depends
    // on the server, so the outcome is told from its answer afterwards.
    const someoneElse = leaveApprover && waitingStep && !stepIsMine && waitingStep.approverRoleId == null
      ? waitingStep.approverName || waitingStep.stepName || 'another approver'
      : null;
    void guarded(
      'approve',
      () => dialog.confirm({ title: 'Approve this leave?', message: approveConfirmText(item, someoneElse), confirmText: 'Approve' }),
      async () => {
        const result = await leaveService.approveLeave(item.id);
        await done(decisionOutcome('approve', item.employeeName || 'Employee', result));
      },
      'Could not approve this leave',
      explainDecision,
    );
  };

  const reject = (item: LeaveApplication) => {
    void guarded(
      'reject',
      () => rejectPrompt(dialog),
      async (reason) => {
        const result = await leaveService.rejectLeave(item.id, reason);
        await done(decisionOutcome('reject', item.employeeName || 'Employee', result));
      },
      'Could not reject this leave',
      explainDecision,
    );
  };

  const withdraw = (item: LeaveApplication) => {
    void guarded(
      'withdraw',
      () => dialog.confirm({
        title: 'Withdraw this leave?',
        message: 'It will be taken off your approver’s list and the days go back to your balance.',
        confirmText: 'Withdraw',
        destructive: true,
      }),
      async () => {
        await leaveService.withdrawApplication(item.id, 'Withdrawn by employee');
        await done('Leave withdrawn');
      },
      'Could not withdraw this leave',
    );
  };

  /**
   * Taking back leave that was already approved — a different act from
   * withdrawing, and kept as a separate word for it. Withdraw pulls an
   * application out of an approver's queue before anyone has answered it;
   * cancel undoes an answer that was already given. The server explains its
   * own refusals ("Cannot cancel a leave whose period has already ended...").
   */
  const cancel = (item: LeaveApplication) => {
    void guarded(
      'cancel',
      () => dialog.confirm({
        title: 'Cancel this approved leave?',
        message: `${dateRangeText(item.startDate, item.endDate)} — ${leaveLength(item)} go back to your balance. Your approver will see that it was cancelled.`,
        confirmText: 'Cancel leave',
        cancelText: 'Keep it',
        destructive: true,
      }),
      async () => {
        await leaveService.cancelApplication(item.id, 'Cancelled by the employee');
        await done('Leave cancelled', 'The days are back on your balance.');
      },
      'Could not cancel this leave',
    );
  };

  /** HR cancelling an employee's approved leave. The reason is required: the employee sees it. */
  const hrCancel = (item: LeaveApplication) => {
    void guarded(
      'hrCancel',
      () => dialog.prompt({
        title: 'Cancel this leave',
        message: `${item.employeeName || 'The employee'}: ${dateRangeText(item.startDate, item.endDate)}. The days go back to their balance, and they will see your reason.`,
        placeholder: 'Reason for cancelling',
        confirmText: 'Cancel leave',
        cancelText: 'Keep it',
        required: true,
        multiline: true,
        maxLength: 1000,
        destructive: true,
      }),
      async (reason) => {
        await leaveService.cancelAsHR(item.id, reason);
        await done(`Cancelled – ${item.employeeName || 'Employee'}`);
      },
      'Could not cancel this leave',
    );
  };

  const openFile = async () => {
    if (!leave) return;
    setBusy(true);
    try {
      await openAttachment(leaveService.attachmentContentUrl(leave.id), leave.attachmentFileName ?? 'attachment');
    } catch (err) {
      // The live server's file route answers only the applicant: everyone else
      // hears "not found", or "join a company" when they have no employee
      // record. Neither is true; say what is.
      const message = serverMessage(err, 'Please try again.');
      await dialog.notify({
        title: 'Could not open the file',
        message: !self && /no longer available|not found|employee record|join a company/i.test(message)
          ? 'This file can’t be opened on the phone from this account yet. Open it on the web, or ask the employee for a copy.'
          : message,
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const addFile = async (source: PickSource) => {
    setSourceSheet(false);
    if (!leave) return;

    let picked;
    try {
      picked = await pickFile(source);
    } catch (err) {
      await dialog.notify({ title: 'Cannot open the picker', message: serverMessage(err, 'Please try again.'), tone: 'warning' });
      return;
    }
    if (!picked) return;

    const why = rejectionReason(picked);
    if (why) {
      await dialog.notify({ title: 'That file cannot be attached', message: why, tone: 'warning' });
      return;
    }

    const file = picked;
    await run(async () => {
      await leaveService.uploadAttachment(leave.id, { uri: file.uri, name: file.name, mimeType: file.mimeType });
      await show(true);
    }, 'Could not attach the file');
  };

  const removeFile = async () => {
    if (!leave) return;
    const ok = await dialog.confirm({
      title: 'Remove this file?',
      message: leave.attachmentFileName ?? undefined,
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    await run(async () => {
      await leaveService.deleteAttachment(leave.id);
      await show(true);
    }, 'Could not remove the file');
  };

  // ── Screen ──────────────────────────────────────────────────────────

  const tint = leave ? leaveTint({ color: leave.leaveTypeColor, code: leave.leaveTypeCode }) : C.muted;
  const hasFooter = isDecider || refusedHere || canWithdraw || canCancel || canHrCancel;
  const held = busy || acting !== null;

  /** Who it is waiting on, in a word, while it is still waiting. */
  const waitingOn = !leave || !pending
    ? null
    : isDecider && stepIsMine
      ? 'You'
      : waitingStep
        ? waitingStep.approverName || waitingStep.stepName || 'An approver'
        : leave.totalApprovalSteps === 0
          ? 'HR'
          : (leave.currentApproverName ?? '').trim() || null;

  const halfDayText = (item: LeaveApplication): string | null => {
    const part = (period: string | null) => (period ? ` (${period === 'AM' ? 'morning' : 'afternoon'})` : '');
    const bits = [
      item.isHalfDayStart ? `First day is a half day${part(item.startDayPeriod)}.` : null,
      item.isHalfDayEnd ? `Last day is a half day${part(item.endDayPeriod)}.` : null,
    ].filter(Boolean);
    return bits.length > 0 ? bits.join(' ') : null;
  };

  /**
   * The trail from submission to now. Always drawn, so a leave type with no
   * approval steps (HR decides it alone) still shows where it stands instead
   * of the page simply ending.
   */
  const timeline = (item: LeaveApplication): TimelineNode[] => {
    const status = (item.status ?? '').toUpperCase();
    const nodes: TimelineNode[] = [{
      key: 'submitted',
      title: status === STATUSES.DRAFT ? 'Draft' : 'Submitted',
      meta: dateAndTime(item.createdAt) || shortDate(item.createdAt),
      look: SUBMITTED,
    }];
    if (status === STATUSES.DRAFT) return nodes;

    const steps = (item.approvals ?? []).slice().sort((a, b) => a.stepOrder - b.stepOrder);
    steps.forEach((step) => {
      const stepStatus = (step.status ?? '').toUpperCase();
      const reached = stepStatus !== STATUSES.PENDING || pending;
      nodes.push({
        key: step.id,
        title: step.stepName || `Step ${step.stepOrder}`,
        meta: !reached
          ? 'Not reached'
          : `${step.approverName || 'Awaiting an approver'}${step.approvedAt ? ` · ${dateAndTime(step.approvedAt)}` : ''}`,
        note: step.comments,
        look: reached ? STEP_LOOK[stepStatus] ?? STEP_LOOK.PENDING : NOT_REACHED,
      });
    });

    if (steps.length === 0) {
      const decidedBy = [item.approvedByEmployeeName, item.approvedAt ? dateAndTime(item.approvedAt) : null].filter(Boolean).join(' · ');
      const hr: Pick<TimelineNode, 'meta' | 'look'> =
        status === STATUSES.PENDING ? { meta: 'Waiting', look: STEP_LOOK.PENDING }
          : status === STATUSES.APPROVED || item.approvedAt ? { meta: decidedBy || 'Approved', look: STEP_LOOK.APPROVED }
            : status === STATUSES.REJECTED ? { meta: 'Rejected', look: STEP_LOOK.REJECTED }
              : { meta: 'Not reached', look: NOT_REACHED };
      nodes.push({ key: 'hr', title: 'HR decision', ...hr });
    }
    return nodes;
  };

  const content = (item: LeaveApplication) => {
    const halfDay = halfDayText(item);
    const code = [item.employeeCode, item.employeeDepartment].filter(Boolean).join(' · ');
    const ago = daysSince(item.createdAt);
    const applied = `${shortDate(item.createdAt)}${ago === null ? '' : ago === 0 ? ' · today' : ` · ${ago} ${ago === 1 ? 'day' : 'days'} ago`}`;
    // The employee manages the file in its own card below; for everyone else
    // it is one fact among the others.
    const fileFact: Fact | null = self && open
      ? null
      : item.attachmentFileName
        ? { label: 'Attachment', value: item.attachmentFileName, onPress: () => { void openFile(); }, icon: 'tray-arrow-down' }
        : { label: 'Attachment', value: 'None' };
    const facts = [
      { label: 'Applied', value: applied },
      extra.balance ? { label: 'Balance', value: extra.balance } : null,
      extra.alsoOff ? { label: 'Also off', value: extra.alsoOff } : null,
      waitingOn ? { label: 'Waiting on', value: waitingOn } : null,
      fileFact,
    ].filter(Boolean) as Fact[];
    const nodes = timeline(item);

    return (
      <>
        {/* Who, what, when */}
        <FormCard>
          {!self ? (
            <>
              <View style={styles.person}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{personInitials(item.employeeName)}</Text>
                </View>
                <View style={styles.personText}>
                  <Text style={styles.personName} numberOfLines={1}>{item.employeeName || 'Employee'}</Text>
                  {code ? <Text style={styles.personCode} numberOfLines={1}>{code}</Text> : null}
                </View>
                <LeaveStatusPill status={item.status} />
              </View>
              <View style={styles.hairline} />
            </>
          ) : null}

          <View style={styles.typeRow}>
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <Text style={styles.typeText} numberOfLines={1}>{item.leaveTypeDescription || 'Leave'}</Text>
            {self ? <LeaveStatusPill status={item.status} /> : null}
          </View>
          {/* No line limit: a range across new year must wrap, never be cut. */}
          <Text style={styles.dates}>{`${dateRangeText(item.startDate, item.endDate)} · ${leaveLength(item)}`}</Text>
          {halfDay ? <Text style={styles.note}>{halfDay}</Text> : null}
        </FormCard>

        {/* What the decision rests on */}
        <FormCard>
          {facts.map((fact, index) => (
            <FactRow key={fact.label} fact={fact} first={index === 0} disabled={busy} />
          ))}
        </FormCard>

        {item.reason ? (
          <FormCard title="Reason">
            <Text style={styles.body}>{item.reason}</Text>
          </FormCard>
        ) : null}

        {item.rejectionReason ? (
          <View style={styles.rejected}>
            <MaterialCommunityIcons name="close-circle-outline" size={18} color={C.danger} />
            <Text style={styles.rejectedText}>{item.rejectionReason}</Text>
          </View>
        ) : null}

        {item.cancellationReason ? (
          <View style={styles.quiet}>
            <MaterialCommunityIcons name="information-outline" size={18} color={C.muted} />
            <Text style={styles.quietText}>{item.cancellationReason}</Text>
          </View>
        ) : null}

        {/* The applicant's own file, while the leave is still open: add, open, remove. */}
        {self && open ? (
          <FormCard title="Supporting document">
            {item.attachmentFileName ? (
              <View style={styles.fileRow}>
                <TouchableOpacity
                  style={styles.fileMain}
                  onPress={() => { void openFile(); }}
                  disabled={busy}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.attachmentFileName}`}
                >
                  <View style={styles.fileIcon}>
                    <MaterialCommunityIcons name={iconForFile(item.attachmentFileName)} size={20} color={C.body} />
                  </View>
                  <View style={styles.fileText}>
                    <Text style={styles.fileName} numberOfLines={1}>{item.attachmentFileName}</Text>
                    <Text style={styles.fileMeta}>Tap to open</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { void removeFile(); }}
                  disabled={busy}
                  style={styles.fileRemove}
                  accessibilityRole="button"
                  accessibilityLabel="Remove the attached file"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <MaterialCommunityIcons name="close" size={18} color={C.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <AttachButton
                onPress={() => setSourceSheet(true)}
                busy={busy}
                label="Add a file"
              />
            )}
          </FormCard>
        ) : null}

        {/* Where it has got to */}
        <FormCard title="Approval">
          {nodes.map((node, index) => (
            <View key={node.key} style={styles.step}>
              <View style={styles.stepRail}>
                <View style={[styles.stepDot, { backgroundColor: node.look.colour }]}>
                  <MaterialCommunityIcons name={node.look.icon} size={12} color="#FFFFFF" />
                </View>
                {index < nodes.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <View style={[styles.stepBody, index === nodes.length - 1 && styles.stepBodyLast]}>
                <Text style={styles.stepTitle} numberOfLines={1}>{node.title}</Text>
                {node.meta ? <Text style={styles.stepMeta} numberOfLines={1}>{node.meta}</Text> : null}
                {node.note ? <Text style={styles.stepNote}>{node.note}</Text> : null}
              </View>
            </View>
          ))}
        </FormCard>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <LeaveHeader title="Leave Details" onBack={() => navigation.goBack()} />

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator color={C.blue} />
          </View>
        ) : load.kind === 'failed' ? (
          <LeaveState
            icon="cloud-off-outline"
            title="Could not load this leave"
            body={load.message}
            tone="danger"
            onRetry={() => { void show(false); }}
          />
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scroll, { paddingBottom: hasFooter ? 16 : 24 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
          >
            {content(load.leave)}
          </ScrollView>
        )}

        {/* What can still be done. Withdrawing takes an application off an
            approver's list before it has been answered; cancelling undoes an
            answer already given. Two states, two words, never merged. */}
        {leave && hasFooter ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {isDecider ? (
              <DecisionButtons
                onReject={() => reject(leave)}
                onApprove={() => approve(leave)}
                acting={acting === 'approve' || acting === 'reject' ? acting : null}
                disabled={held}
                name={leave.employeeName || undefined}
              />
            ) : null}

            {refusedHere ? <Text style={styles.webOnly}>Decide this on the web for now</Text> : null}

            {canWithdraw ? (
              <DangerOutlineButton
                icon="undo-variant"
                label="Withdraw this leave"
                onPress={() => withdraw(leave)}
                busy={acting === 'withdraw'}
                disabled={held}
              />
            ) : null}

            {canCancel ? (
              <DangerOutlineButton
                icon="calendar-remove-outline"
                label="Cancel this leave"
                onPress={() => cancel(leave)}
                busy={acting === 'cancel'}
                disabled={held}
              />
            ) : null}

            {canHrCancel ? (
              <DangerOutlineButton
                icon="calendar-remove-outline"
                label="Cancel leave"
                onPress={() => hrCancel(leave)}
                busy={acting === 'hrCancel'}
                disabled={held}
              />
            ) : null}
          </View>
        ) : null}
      </SafeAreaView>

      <PickSourceSheet
        visible={sourceSheet}
        onClose={() => setSourceSheet(false)}
        onPick={(source) => { void addFile(source); }}
      />
    </View>
  );
};

/** One label/value line of the facts card; tappable when it opens something (the file). */
const FactRow: React.FC<{ fact: Fact; first: boolean; disabled: boolean }> = ({ fact, first, disabled }) => {
  const inner = (
    <>
      <Text style={styles.factLabel}>{fact.label}</Text>
      <Text style={styles.factValue} numberOfLines={2}>{fact.value}</Text>
      {fact.icon ? <MaterialCommunityIcons name={fact.icon} size={18} color={C.muted} /> : null}
    </>
  );
  return fact.onPress ? (
    <TouchableOpacity
      style={[styles.fact, !first && styles.factRule]}
      onPress={fact.onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${fact.label}, ${fact.value}, open`}
    >
      {inner}
    </TouchableOpacity>
  ) : (
    <View style={[styles.fact, !first && styles.factRule]} accessible accessibilityLabel={`${fact.label}, ${fact.value}`}>
      {inner}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  person: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: C.ink },
  personText: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '700', color: C.ink },
  personCode: { fontSize: 12, color: C.muted, marginTop: 1 },
  hairline: { height: 1, backgroundColor: C.line, marginVertical: 12 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  typeText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink },
  dates: { fontSize: 14, color: C.ink, marginTop: 4 },
  note: { fontSize: 12, color: C.muted, marginTop: 6 },

  fact: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingVertical: 8 },
  factRule: { borderTopWidth: 1, borderTopColor: C.line },
  factLabel: { fontSize: 13, color: C.muted },
  factValue: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink, textAlign: 'right' },

  body: { fontSize: 14, lineHeight: 20, color: C.ink },

  rejected: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 16,
    padding: 14,
  },
  rejectedText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.danger },

  quiet: { ...LEAVE_CARD, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14 },
  quietText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.body },

  fileRow: { flexDirection: 'row', alignItems: 'center' },
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  fileIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.field, borderWidth: 1, borderColor: C.line, justifyContent: 'center', alignItems: 'center' },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: C.ink },
  fileMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  fileRemove: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  step: { flexDirection: 'row', gap: 12 },
  stepRail: { width: 22, alignItems: 'center' },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, width: 2, backgroundColor: C.line, marginVertical: 3 },
  stepBody: { flex: 1, paddingBottom: 12 },
  stepBodyLast: { paddingBottom: 0 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: C.ink },
  stepMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  stepNote: { fontSize: 12, color: C.muted, marginTop: 4, fontStyle: 'italic' },

  footer: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  webOnly: { fontSize: 12, color: C.muted, textAlign: 'center', paddingVertical: 4 },
});

export default LeaveDetailsScreen;
