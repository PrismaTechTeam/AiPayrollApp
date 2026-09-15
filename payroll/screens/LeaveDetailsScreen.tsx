/**
 * One leave application, and what can still be done about it.
 *
 * Three readers on one page. The employee sees what they asked for, where it
 * has got to, and the way to take it back. The approver of the step that is
 * actually waiting sees approve and reject — nobody else does, because a button
 * that fails on the server is worse than no button. HR reading through the web
 * API sees the same record without the employee-level check.
 *
 * The supporting file lives here too. Until now leave had nowhere to carry one,
 * so a medical certificate had no way onto a medical leave; it can be added
 * here for as long as the application is still open, and read back afterwards
 * by whoever has to decide on it.
 */
import React, { useCallback, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
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
import { AttachButton, PickSourceSheet, StatusPill, dateAndTime, shortDate } from '../components/requests/RequestUi';
import {
  FormCard,
  LeaveState,
  dateRangeText,
  dayText,
  dayNumber,
  leaveIcon,
  leaveTint,
  leaveWash,
} from '../components/leave/LeaveUi';

type Params = {
  LeaveDetails: {
    leaveId?: string;
    /** Kept for older call sites that passed the whole row instead of an id. */
    leave?: { id?: string; _raw?: { id?: string } };
    canApprove?: boolean;
  };
};

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; leave: LeaveApplication }
  | { kind: 'failed'; message: string };

const STEP_LOOK: Record<string, { colour: string; icon: 'check' | 'close' | 'clock-outline' }> = {
  APPROVED: { colour: '#15803D', icon: 'check' },
  REJECTED: { colour: '#B91C1C', icon: 'close' },
  PENDING: { colour: '#B45309', icon: 'clock-outline' },
};

export const LeaveDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'LeaveDetails'>>();
  const dialog = useDialog();
  const { user } = usePayrollAuth();

  const { leaveId, leave: legacy, canApprove = false } = route.params ?? {};
  const id = leaveId ?? legacy?._raw?.id ?? legacy?.id ?? null;

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sourceSheet, setSourceSheet] = useState(false);

  // HR and owners read through the web API, which has no employee-level check;
  // employees and approvers read through the mobile one, which does.
  const leaveApprover = useApproverAccess().leave;
  const asHr = canApprove && leaveApprover;
  const { departmentIds } = useDepartmentApprover();

  const fetch = useCallback(async () => {
    if (!id) {
      setLoad({ kind: 'failed', message: 'This leave could not be opened. Go back and try again.' });
      return;
    }
    try {
      const leave = asHr
        ? await leaveService.getApplicationByIdAsHR(id)
        : await leaveService.getApplicationById(id);
      setLoad({ kind: 'ready', leave });
    } catch (err) {
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load this leave.') });
    }
  }, [id, asHr]);

  useFocusEffect(
    useCallback(() => {
      setLoad({ kind: 'loading' });
      void fetch();
    }, [fetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  };

  const leave = load.kind === 'ready' ? load.leave : null;
  const open = leave?.status === STATUSES.PENDING || leave?.status === STATUSES.DRAFT;

  /**
   * The step that is actually waiting, and whether the reader is the one it is
   * waiting on — either by name, or by role for a step HR fills.
   */
  const waitingStep = leave?.status === STATUSES.PENDING
    ? leave.approvals?.find((a) => a.stepOrder === leave.currentApprovalStep && a.status === STATUSES.PENDING)
    : undefined;

  const isDecider = waitingStep != null && (
    (waitingStep.approverId != null && user?.employeeId === waitingStep.approverId)
    || (waitingStep.approverId == null && waitingStep.approverRoleId != null && asHr)
    // A department step: any of that department's approvers, or HR on their behalf.
    || (waitingStep.approverId == null && waitingStep.approverDepartmentId != null && canApprove && (
      asHr
      || (departmentIds.includes(waitingStep.approverDepartmentId) && leave?.employeeId !== user?.employeeId)
    ))
  );

  const isMine = !canApprove;

  /**
   * Whether an approved leave can still be taken back.
   *
   * The server refuses to cancel a leave whose period has already ended — those
   * days may have been paid already, and HR adjusts them by hand — and it draws
   * that line against UTC today. The button is drawn on exactly the same line,
   * because offering an action the server is certain to refuse is worse than
   * offering none. An empty end date sorts before any real date and so hides it.
   */
  const todayUtc = new Date().toISOString().slice(0, 10);
  const canCancel =
    isMine && leave?.status === STATUSES.APPROVED && (leave.endDate ?? '').slice(0, 10) >= todayUtc;

  // ── Actions ─────────────────────────────────────────────────────────

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

  const approve = async () => {
    if (!leave) return;
    const ok = await dialog.confirm({
      title: 'Approve this leave?',
      message: `${leave.employeeName} — ${dateRangeText(leave.startDate, leave.endDate)}, ${dayText(leave.totalDays)}.`,
      confirmText: 'Approve',
    });
    if (!ok) return;

    await run(async () => {
      await leaveService.approveLeave(leave.id);
      await dialog.notify({ title: 'Leave approved', tone: 'success' });
      navigation.goBack();
    }, 'Could not approve this leave');
  };

  const reject = async () => {
    if (!leave) return;
    // A rejection the employee cannot explain to their manager is worthless, so
    // the reason is required rather than filled in with "Rejected by approver".
    const reason = await dialog.prompt({
      title: 'Reject this leave',
      message: 'Say why. The employee will see this.',
      placeholder: 'Reason for rejecting',
      required: true,
      multiline: true,
      maxLength: 300,
      confirmText: 'Reject',
      destructive: true,
    });
    if (!reason) return;

    await run(async () => {
      await leaveService.rejectLeave(leave.id, reason);
      await dialog.notify({ title: 'Leave rejected', tone: 'success' });
      navigation.goBack();
    }, 'Could not reject this leave');
  };

  const withdraw = async () => {
    if (!leave) return;
    const ok = await dialog.confirm({
      title: 'Withdraw this leave?',
      message: 'It will be taken off your approver’s list and the days go back to your balance.',
      confirmText: 'Withdraw',
      destructive: true,
    });
    if (!ok) return;

    await run(async () => {
      await leaveService.withdrawApplication(leave.id, 'Withdrawn by employee');
      await dialog.notify({ title: 'Leave withdrawn', tone: 'success' });
      navigation.goBack();
    }, 'Could not withdraw this leave');
  };

  /**
   * Taking back leave that was already approved — a different act from
   * withdrawing, and kept as a separate word for it.
   *
   * Withdraw pulls an application out of an approver's queue before anyone has
   * answered it. Cancel undoes an answer that was already given: leave approved
   * in October for a December trip that then fell through. Until now the app
   * had no route for it at all and the employee had to phone HR.
   */
  const cancel = async () => {
    if (!leave) return;
    const ok = await dialog.confirm({
      title: 'Cancel this approved leave?',
      message: `${dateRangeText(leave.startDate, leave.endDate)} — ${dayText(leave.totalDays)} go back to your balance. Your approver will see that it was cancelled.`,
      confirmText: 'Cancel leave',
      cancelText: 'Keep it',
      destructive: true,
    });
    if (!ok) return;

    await run(async () => {
      await leaveService.cancelApplication(leave.id, 'Cancelled by the employee');
      await dialog.notify({ title: 'Leave cancelled', message: 'The days are back on your balance.', tone: 'success' });
      navigation.goBack();
    // The server explains its own refusals — "Cannot cancel a leave whose period
    // has already ended. Contact HR to make a manual adjustment." — and `run`
    // shows that sentence rather than a generic failure.
    }, 'Could not cancel this leave');
  };

  const openFile = async () => {
    if (!leave) return;
    await run(async () => {
      await openAttachment(leaveService.attachmentContentUrl(leave.id), leave.attachmentFileName ?? 'attachment');
    }, 'Could not open the file');
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
      await fetch();
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
      await fetch();
    }, 'Could not remove the file');
  };

  // ── Screen ──────────────────────────────────────────────────────────

  const tint = leave ? leaveTint({ color: leave.leaveTypeColor, code: leave.leaveTypeCode }) : C.blue;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Leave Details</Text>
          </View>
        </View>

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
            onRetry={() => void fetch()}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
          >
            {/* What was asked for */}
            <FormCard>
              <View style={styles.top}>
                <View style={[styles.topIcon, { backgroundColor: leaveWash(tint) }]}>
                  <MaterialCommunityIcons name={leaveIcon(load.leave.leaveTypeCode)} size={24} color={tint} />
                </View>
                <View style={styles.topBody}>
                  <Text style={styles.topTitle} numberOfLines={1}>
                    {load.leave.leaveTypeDescription || 'Leave'}
                  </Text>
                  <Text style={styles.topMeta} numberOfLines={1}>
                    {dateRangeText(load.leave.startDate, load.leave.endDate)}
                  </Text>
                </View>
                <StatusPill status={load.leave.status} />
              </View>

              <View style={styles.cells}>
                <Cell
                  label={load.leave.totalHours != null ? 'Hours' : 'Days'}
                  value={dayNumber(load.leave.totalHours ?? load.leave.totalDays)}
                  tone={tint}
                />
                <View style={styles.rule} />
                <Cell label="Applied" value={shortDate(load.leave.createdAt)} />
                <View style={styles.rule} />
                <Cell
                  label="Step"
                  value={load.leave.totalApprovalSteps > 0
                    ? `${Math.min(load.leave.currentApprovalStep, load.leave.totalApprovalSteps)}/${load.leave.totalApprovalSteps}`
                    : '—'}
                />
              </View>

              {/* Only the lines that add something get printed. */}
              {load.leave.isHalfDayStart || load.leave.isHalfDayEnd ? (
                <Text style={styles.note}>
                  {load.leave.isHalfDayStart
                    ? `First day is a half day${load.leave.startDayPeriod ? ` (${load.leave.startDayPeriod === 'AM' ? 'morning' : 'afternoon'})` : ''}.`
                    : ''}
                  {load.leave.isHalfDayStart && load.leave.isHalfDayEnd ? ' ' : ''}
                  {load.leave.isHalfDayEnd
                    ? `Last day is a half day${load.leave.endDayPeriod ? ` (${load.leave.endDayPeriod === 'AM' ? 'morning' : 'afternoon'})` : ''}.`
                    : ''}
                </Text>
              ) : null}
              {load.leave.employeeName && canApprove ? (
                <Text style={styles.note}>
                  {load.leave.employeeName}
                  {load.leave.employeeCode ? ` · ${load.leave.employeeCode}` : ''}
                  {load.leave.employeeDepartment ? ` · ${load.leave.employeeDepartment}` : ''}
                </Text>
              ) : null}
            </FormCard>

            {/* Why */}
            {load.leave.reason ? (
              <FormCard title="Reason" icon="text-box-outline">
                <Text style={styles.body}>{load.leave.reason}</Text>
              </FormCard>
            ) : null}

            {load.leave.rejectionReason ? (
              <View style={styles.rejected}>
                <MaterialCommunityIcons name="close-circle-outline" size={18} color={C.danger} />
                <Text style={styles.rejectedText}>{load.leave.rejectionReason}</Text>
              </View>
            ) : null}

            {load.leave.cancellationReason ? (
              <View style={styles.quiet}>
                <MaterialCommunityIcons name="information-outline" size={18} color={C.muted} />
                <Text style={styles.quietText}>{load.leave.cancellationReason}</Text>
              </View>
            ) : null}

            {/* Evidence */}
            {load.leave.attachmentFileName || (isMine && open) ? (
              <FormCard title="Supporting document" icon="paperclip">
                {load.leave.attachmentFileName ? (
                  <View style={styles.fileRow}>
                    <TouchableOpacity
                      style={styles.fileMain}
                      onPress={() => { void openFile(); }}
                      disabled={busy}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <View style={styles.fileIcon}>
                        <MaterialCommunityIcons name={iconForFile(load.leave.attachmentFileName)} size={22} color={C.blue} />
                      </View>
                      <View style={styles.fileText}>
                        <Text style={styles.fileName} numberOfLines={1}>{load.leave.attachmentFileName}</Text>
                        <Text style={styles.fileMeta}>Tap to open</Text>
                      </View>
                      <MaterialCommunityIcons name="tray-arrow-down" size={20} color={C.muted} />
                    </TouchableOpacity>
                    {isMine && open ? (
                      <TouchableOpacity
                        onPress={() => { void removeFile(); }}
                        disabled={busy}
                        style={styles.fileRemove}
                        accessibilityRole="button"
                        accessibilityLabel="Remove the attached file"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="close" size={18} color={C.danger} />
                      </TouchableOpacity>
                    ) : null}
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
            {load.leave.approvals && load.leave.approvals.length > 0 ? (
              <FormCard title="Approval" icon="account-check-outline">
                {load.leave.approvals
                  .slice()
                  .sort((a, b) => a.stepOrder - b.stepOrder)
                  .map((step, index, all) => {
                    const look = STEP_LOOK[step.status?.toUpperCase() ?? ''] ?? STEP_LOOK.PENDING;
                    return (
                      <View key={step.id} style={styles.step}>
                        <View style={styles.stepRail}>
                          <View style={[styles.stepDot, { backgroundColor: look.colour }]}>
                            <MaterialCommunityIcons name={look.icon} size={13} color="#FFFFFF" />
                          </View>
                          {index < all.length - 1 ? <View style={styles.stepLine} /> : null}
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepTitle} numberOfLines={1}>
                            {step.stepName || `Step ${step.stepOrder}`}
                          </Text>
                          <Text style={styles.stepMeta} numberOfLines={1}>
                            {step.approverName || 'Awaiting an approver'}
                            {step.approvedAt ? ` · ${dateAndTime(step.approvedAt)}` : ''}
                          </Text>
                          {step.comments ? <Text style={styles.stepNote}>{step.comments}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
              </FormCard>
            ) : null}

            {/* What can still be done */}
            {isDecider ? (
              <>
                <PrimaryButton icon="check" label="Approve" onPress={() => { void approve(); }} disabled={busy} />
                <PrimaryButton label="Reject" onPress={() => { void reject(); }} variant="danger" disabled={busy} />
              </>
            ) : null}

            {/* Two states, two words. Withdrawing takes an application off an
                approver's list before it has been answered; cancelling undoes an
                answer already given. Merging them would leave the employee
                guessing which one they are about to do. */}
            {isMine && load.leave.status === STATUSES.PENDING ? (
              <PrimaryButton
                icon="undo-variant"
                label="Withdraw this leave"
                onPress={() => { void withdraw(); }}
                variant="danger"
                disabled={busy}
              />
            ) : null}

            {canCancel ? (
              <PrimaryButton
                icon="calendar-remove-outline"
                label="Cancel this leave"
                onPress={() => { void cancel(); }}
                variant="danger"
                disabled={busy}
              />
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

      <PickSourceSheet
        visible={sourceSheet}
        onClose={() => setSourceSheet(false)}
        onPick={(source) => { void addFile(source); }}
      />
    </View>
  );
};

const Cell: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <View style={styles.cell}>
    <Text style={[styles.cellValue, tone ? { color: tone } : null]} numberOfLines={1}>{value}</Text>
    <Text style={styles.cellLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  topBody: { flex: 1 },
  topTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  topMeta: { fontSize: 13, color: C.body, marginTop: 2 },

  cells: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  cell: { flex: 1, alignItems: 'center' },
  cellValue: { fontSize: 18, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  cellLabel: { fontSize: 12, color: C.muted, marginTop: 3 },
  rule: { width: 1, height: 28, backgroundColor: C.line },

  note: { fontSize: 12, color: C.body, marginTop: 12 },
  body: { fontSize: 14, lineHeight: 21, color: C.ink },

  rejected: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 14,
    padding: 14,
  },
  rejectedText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.danger },

  quiet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14 },
  quietText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.body },

  fileRow: { flexDirection: 'row', alignItems: 'center' },
  fileMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  fileMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  fileRemove: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  step: { flexDirection: 'row', gap: 12 },
  stepRail: { width: 24, alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, width: 2, backgroundColor: C.line, marginVertical: 3 },
  stepBody: { flex: 1, paddingBottom: 16 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  stepMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  stepNote: { fontSize: 12, color: C.muted, marginTop: 4, fontStyle: 'italic' },
});

export default LeaveDetailsScreen;
