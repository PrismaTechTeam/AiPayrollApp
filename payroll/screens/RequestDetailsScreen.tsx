/**
 * Request Details
 * One request, both sides of it: what was asked, the conversation about it, the
 * files each side attached, and what happened to it when.
 *
 * The screen always re-fetches on open. It used to render whatever object the
 * list handed it, so a request decided while the list was on screen still read
 * as pending, and an attachment added from the web never appeared at all.
 *
 * The decision buttons (Approve / Reject for HR, Cancel for the employee) sit in
 * a footer that never scrolls away: they are the reason most people open this
 * page, and they used to be 250pt below the fold. Approving or rejecting goes
 * back to the list, so working through a queue is one tap per request, not two.
 *
 * An approver looking at their own request gets the employee's page. Nobody
 * decides or answers their own request; the server refuses the decision anyway.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import type { IconName } from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { DecisionButtons } from '../components/ui/ApprovalCard';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import requestService, { EmployeeRequest, RequestAttachment } from '../api/services/requestService';
import { openAttachment } from '../lib/downloadAttachment';
import { pickFile, rejectionReason, MAX_FILES_PER_SIDE, type PickSource, type PickedFile } from '../lib/requestAttachments';
import { serverMessage } from '../lib/serverMessage';
import {
  CARD_SURFACE,
  StatusPill,
  AttachmentRow,
  AttachButton,
  ErrorBanner,
  ListState,
  PickSourceSheet,
  RequestHeader,
  initials,
  parseDate,
  requestError,
  requestTypeColor,
  statusOf,
  shortDate,
  dateAndTime,
  waitingDays,
} from '../components/requests/RequestUi';

const APPROVED_GREEN = '#15803D';
const PENDING_AMBER = '#B45309';

/** A card's heading: small line icon, title, and an optional count or action. */
const CardHead: React.FC<{ icon: IconName; title: string; right?: React.ReactNode }> = ({ icon, title, right }) => (
  <View style={styles.cardHead}>
    <View style={styles.cardIcon}>
      <MaterialCommunityIcons name={icon} size={16} color={C.body} />
    </View>
    <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
    {right}
  </View>
);

/** One label / value line of the facts card. */
const Fact: React.FC<{ label: string; value: string; last?: boolean }> = ({ label, value, last = false }) => (
  <View style={[styles.fact, !last && styles.factDivider]}>
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue} numberOfLines={2}>{value}</Text>
  </View>
);

type StepTone = 'done' | 'approved' | 'rejected' | 'muted' | 'waiting';
type Step = { key: string; title: string; detail?: string; at: string | null; tone: StepTone };

type Params = {
  RequestDetails: {
    /** Preferred. The screen fetches the rest itself. */
    requestId?: string;
    /** Older callers passed the whole row; used only as a first paint. */
    request?: EmployeeRequest;
    canApprove?: boolean;
  };
};

export const RequestDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'RequestDetails'>>();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { user } = usePayrollAuth();
  const access = useApproverAccess();

  const params = route.params ?? {};
  const canApprove = params.canApprove === true;
  const requestId = params.requestId ?? params.request?.id ?? '';
  const myEmployeeId = user?.employeeId ?? null;

  const [request, setRequest] = useState<EmployeeRequest | null>(params.request ?? null);
  const [files, setFiles] = useState<RequestAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One flag per kind of action, so sending a reply never spins Approve and
  // approving never spins the reply link.
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);
  const [replying, setReplying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // A second tap lands before the first one's state update does; without this
  // a quick double tap opens two confirm dialogs.
  const actingRef = useRef(false);

  const load = useCallback(async () => {
    if (!requestId) {
      setError('This request could not be opened.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      // The approver reads through the HR endpoint, which is gated on the access
      // right rather than on owning the record. It carries every file on the
      // request already, so there is no second call for them.
      const detail = canApprove
        ? await requestService.getRequestById(requestId)
        : await requestService.getApplication(requestId);
      setRequest(detail);
      setFiles(detail.attachments ?? []);
    } catch (err) {
      setError(requestError(err, 'Could not load this request.'));
    } finally {
      setLoading(false);
    }
  }, [requestId, canApprove]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isOwn = !!request && !!myEmployeeId && request.employeeId === myEmployeeId;
  const asApprover = canApprove && !isOwn;
  // canApprove comes from how the page was opened (a notification sets it from the type alone),
  // so Approve and Reject also need the right itself; without it they could only answer 403.
  const decidable = asApprover && access.requests;

  const status = statusOf(request?.status);
  const open = status === 'PENDING' || status === 'DRAFT';
  const mine = files.filter((f) => f.uploadedByRole === 'EMPLOYEE');
  const fromHr = files.filter((f) => f.uploadedByRole === 'HR');
  const mySideCount = asApprover ? fromHr.length : mine.length;
  // HR may send a file back at any point; the employee only while it is open.
  const canAttach = asApprover ? true : open;
  const hasMessages = Boolean(request?.hrReply || request?.employeeReply);
  const canReplyToHr = !asApprover && hasMessages;
  const typeName = request ? request.requestTypeName || request.requestType || 'Request' : '';
  const typeForSentence = typeName.replace(/\s+request$/i, '');

  const contentUrl = useMemo(
    () => (asApprover ? requestService.approverAttachmentContentUrl : requestService.attachmentContentUrl),
    [asApprover],
  );

  // ── Files ───────────────────────────────────────────────────────────

  const openFile = async (file: RequestAttachment) => {
    try {
      await openAttachment(contentUrl(file.id), file.fileName);
    } catch (err) {
      await dialog.notify({
        title: 'Could not open the file',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  const addFile = async (source: PickSource) => {
    if (mySideCount >= MAX_FILES_PER_SIDE) {
      await dialog.notify({
        title: 'That is enough files',
        message: `A request can carry at most ${MAX_FILES_PER_SIDE} files from each side.`,
        tone: 'warning',
      });
      return;
    }

    let picked: PickedFile | null;
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

    setUploading(true);
    try {
      const created = asApprover
        ? await requestService.uploadAttachmentAsApprover(requestId, picked)
        : await requestService.uploadAttachment(requestId, picked);
      setFiles((prev) => [...prev, created]);
    } catch (err) {
      await dialog.notify({
        title: 'Upload failed',
        message: serverMessage(err, 'Could not attach the file. Please try again.'),
        tone: 'danger',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (file: RequestAttachment) => {
    const ok = await dialog.confirm({
      title: 'Remove this file?',
      message: file.fileName,
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;

    try {
      if (asApprover) await requestService.deleteAttachmentAsApprover(file.id);
      else await requestService.deleteAttachment(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      await dialog.notify({
        title: 'Could not remove the file',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
      // The server may have removed it anyway; re-read rather than guess.
      void load();
    }
  };

  // ── Decisions ───────────────────────────────────────────────────────

  /**
   * Back to the list once decided: it reloads on focus, and the item has left
   * the Pending tab. Opened from a notification with nothing underneath, the
   * page stays and shows the new status instead.
   */
  const afterDecision = async () => {
    if (navigation.canGoBack()) navigation.goBack();
    else await load();
  };

  const approve = async () => {
    if (actingRef.current) return;
    actingRef.current = true;
    try {
      const ok = await dialog.confirm({
        title: request?.employeeName
          ? `Approve ${request.employeeName}'s ${typeForSentence} request?`
          : `Approve this ${typeForSentence} request?`,
        message: `${request?.employeeName ?? 'The employee'} will be told straight away.`,
        confirmText: 'Approve',
      });
      if (!ok) return;

      setDeciding('approve');
      try {
        await requestService.approveRequest(requestId);
        await afterDecision();
      } catch (err) {
        await dialog.notify({ title: 'Could not approve', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        // Most often someone else decided it first; show what it is now.
        await load();
      }
    } finally {
      setDeciding(null);
      actingRef.current = false;
    }
  };

  const reject = async () => {
    if (actingRef.current) return;
    actingRef.current = true;
    try {
      const reason = await dialog.prompt({
        title: request?.employeeName
          ? `Reject ${request.employeeName}'s ${typeForSentence} request`
          : `Reject this ${typeForSentence} request`,
        message: `${request?.employeeName ?? 'The employee'} sees this, so say what would make it approvable.`,
        placeholder: 'Reason for rejection',
        confirmText: 'Reject',
        required: true,
        multiline: true,
        maxLength: 1000,
        destructive: true,
      });
      if (!reason) return;

      setDeciding('reject');
      try {
        await requestService.rejectRequest(requestId, reason);
        await afterDecision();
      } catch (err) {
        await dialog.notify({ title: 'Could not reject', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        await load();
      }
    } finally {
      setDeciding(null);
      actingRef.current = false;
    }
  };

  const reply = async () => {
    if (actingRef.current) return;
    actingRef.current = true;
    try {
      const message = asApprover
        ? await dialog.prompt({
          title: request?.hrReply ? 'Edit your reply' : 'Reply to the employee',
          message: 'They see this on their phone. Leave it empty to remove your reply.',
          placeholder: 'e.g. Collect the letter from level 3 after Tuesday.',
          initialValue: request?.hrReply ?? '',
          confirmText: 'Send',
          multiline: true,
          maxLength: 2000,
        })
        : await dialog.prompt({
          title: request?.employeeReply ? 'Edit your reply' : 'Reply to HR',
          message: 'HR sees this with your request. Leave it empty to remove your reply.',
          placeholder: 'e.g. I have attached the letter.',
          initialValue: request?.employeeReply ?? '',
          confirmText: 'Send',
          multiline: true,
          maxLength: 2000,
        });
      if (message === null) return;

      setReplying(true);
      try {
        if (asApprover) await requestService.replyToRequest(requestId, message);
        else await requestService.replyAsEmployee(requestId, message);
        await load();
      } catch (err) {
        await dialog.notify({ title: 'Could not send the reply', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
      }
    } finally {
      setReplying(false);
      actingRef.current = false;
    }
  };

  const cancel = async () => {
    if (actingRef.current) return;
    actingRef.current = true;
    try {
      const ok = await dialog.confirm({
        title: 'Cancel this request?',
        message: `"${typeName || 'This request'}" will be withdrawn. You can send a new one any time.`,
        confirmText: 'Yes, cancel',
        cancelText: 'Keep it',
        destructive: true,
        tone: 'warning',
      });
      if (!ok) return;

      setCancelling(true);
      try {
        await requestService.cancelApplication(requestId);
        navigation.goBack();
      } catch (err) {
        await dialog.notify({ title: 'Could not cancel', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        await load();
        setCancelling(false);
      }
    } finally {
      actingRef.current = false;
    }
  };

  // ── What happened, in order ─────────────────────────────────────────

  // Built from the fields the request already carries, so it works on today's
  // server; "by Siti" appears once the server sends the decider's name.
  const steps = useMemo<Step[]>(() => {
    if (!request) return [];
    const who = request.employeeName || 'the employee';
    const dated: Step[] = [
      { key: 'sent', title: asApprover ? `Sent by ${who}` : 'You sent it', at: request.createdAt, tone: 'done' },
    ];
    if (request.hrReply && request.hrReplyAt) {
      dated.push({ key: 'hr', title: `${request.hrReplyByName || 'HR'} replied`, at: request.hrReplyAt, tone: 'done' });
    }
    if (request.employeeReply && request.employeeReplyAt) {
      dated.push({ key: 'emp', title: asApprover ? `${request.employeeName || 'Employee'} replied` : 'You replied', at: request.employeeReplyAt, tone: 'done' });
    }
    if (status === 'APPROVED' || status === 'REJECTED') {
      const verb = status === 'APPROVED' ? 'Approved' : 'Rejected';
      dated.push({
        key: 'decided',
        title: request.reviewedByName ? `${verb} by ${request.reviewedByName}` : verb,
        at: request.reviewedAt ?? request.updatedAt,
        tone: status === 'APPROVED' ? 'approved' : 'rejected',
      });
    } else if (status === 'CANCELLED' || status === 'WITHDRAWN') {
      dated.push({ key: 'cancelled', title: asApprover ? `Cancelled by ${who}` : 'You cancelled it', at: request.updatedAt, tone: 'muted' });
    }
    // A reply can come after the decision; the list follows the clock.
    const time = (s: Step) => parseDate(s.at)?.getTime() ?? 0;
    const ordered: Step[] = dated
      .map((s, i) => ({ s, i }))
      .sort((a, b) => time(a.s) - time(b.s) || a.i - b.i)
      .map(({ s }) => ({ ...s, detail: s.at ? dateAndTime(s.at) : undefined }));
    // The open step still to come. How long it has waited is in the facts above.
    if (status === 'PENDING') {
      ordered.push({ key: 'waiting', title: 'Waiting for a decision', at: null, tone: 'waiting' });
    }
    return ordered;
  }, [request, asApprover, status]);

  // ── Render ──────────────────────────────────────────────────────────

  const showFooter = !!request && status === 'PENDING';
  // With no conversation yet, an empty Messages card only held a Reply link and
  // looked unfinished; the reply starts from the facts card instead.
  const replyRow = asApprover && !hasMessages;
  const facts: { label: string; value: string }[] = [];
  if (request) {
    facts.push({ label: 'Submitted', value: dateAndTime(request.createdAt) || shortDate(request.createdAt) });
    const days = status === 'PENDING' ? waitingDays(request.createdAt) : null;
    if (days !== null) facts.push({ label: 'Waiting', value: days === 0 ? 'Since today' : `${days} ${days === 1 ? 'day' : 'days'}` });
    // Who decided and when is the timeline's job; repeating it here only made the page longer.
    facts.push({ label: 'Files', value: files.length === 0 ? 'None' : `${files.length} ${files.length === 1 ? 'file' : 'files'}` });
  }
  const personMeta = request
    ? [request.employeeCode, request.departmentName].filter(Boolean).join(' · ')
    : '';
  const replyLabel = (asApprover ? request?.hrReply : request?.employeeReply)
    ? 'Edit reply'
    : asApprover ? 'Reply' : 'Reply to HR';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <RequestHeader title="Request Details" subtitle={typeName || null} onBack={() => navigation.goBack()} />

        {loading && !request ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : !request ? (
          <View style={styles.centerPad}>
            <ListState
              icon="alert-circle-outline"
              tone="danger"
              title="Could not open this request"
              body={error ?? 'It may have been removed.'}
              actionLabel="Try again"
              onAction={() => {
                setLoading(true);
                void load();
              }}
            />
          </View>
        ) : (
          <>
            {error ? <ErrorBanner message={error} onRetry={() => { void load(); }} /> : null}

            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scroll, !showFooter && { paddingBottom: 16 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            >
              {/* Who asked for what */}
              <View style={styles.card}>
                {asApprover ? (
                  <>
                    <View style={styles.personRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(request.employeeName)}</Text>
                      </View>
                      <View style={styles.personText}>
                        <Text style={styles.personName} numberOfLines={1}>{request.employeeName ?? 'Employee'}</Text>
                        {personMeta ? <Text style={styles.personMeta} numberOfLines={1}>{personMeta}</Text> : null}
                      </View>
                      <StatusPill status={request.status} />
                    </View>
                    <View style={[styles.typeRow, styles.typeRowBelow]}>
                      <View style={[styles.typeDot, { backgroundColor: requestTypeColor(request.requestTypeId || typeName) }]} />
                      <Text style={styles.typeText} numberOfLines={2}>{typeName}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.typeRow}>
                    <View style={[styles.typeDot, { backgroundColor: requestTypeColor(request.requestTypeId || typeName) }]} />
                    <Text style={styles.typeText} numberOfLines={2}>{typeName}</Text>
                    <StatusPill status={request.status} />
                  </View>
                )}

                {request.notes ? (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.blockLabel}>Note</Text>
                    <Text style={styles.blockText}>{request.notes}</Text>
                  </>
                ) : null}

                {status === 'REJECTED' && request.rejectionReason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason for rejection</Text>
                    <Text style={styles.reasonText}>{request.rejectionReason}</Text>
                  </View>
                ) : null}
              </View>

              {/* The facts, one per line */}
              <View style={[styles.card, styles.factsCard]}>
                {facts.map((f, i) => (
                  <Fact key={f.label} label={f.label} value={f.value} last={i === facts.length - 1 && !replyRow} />
                ))}
                {replyRow ? (
                  <TouchableOpacity
                    onPress={() => { void reply(); }}
                    disabled={replying}
                    style={styles.factAction}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Reply to the employee"
                  >
                    {replying ? (
                      <ActivityIndicator size="small" color={C.blue} />
                    ) : (
                      <MaterialCommunityIcons name="reply-outline" size={18} color={C.blue} />
                    )}
                    <Text style={styles.factActionText}>Reply to the employee</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* The conversation: HR's answer and the employee's reply to it */}
              {hasMessages ? (
                <View style={styles.card}>
                  <CardHead
                    icon="message-text-outline"
                    title="Messages"
                    right={
                      asApprover || canReplyToHr ? (
                        <TouchableOpacity
                          onPress={() => { void reply(); }}
                          disabled={replying}
                          style={styles.link}
                          accessibilityRole="button"
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          {replying ? (
                            <ActivityIndicator size="small" color={C.blue} />
                          ) : (
                            <>
                              <MaterialCommunityIcons
                                name={replyLabel === 'Edit reply' ? 'pencil-outline' : 'reply-outline'}
                                size={16}
                                color={C.blue}
                              />
                              <Text style={styles.linkText}>{replyLabel}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : null
                    }
                  />

                  {request.hrReply ? (
                    <View style={styles.message}>
                      <Text style={styles.messageMeta} numberOfLines={1}>
                        <Text style={styles.messageWho}>{request.hrReplyByName || 'HR'}</Text>
                        {request.hrReplyAt ? ` · ${dateAndTime(request.hrReplyAt)}` : ''}
                      </Text>
                      <Text style={styles.messageText}>{request.hrReply}</Text>
                    </View>
                  ) : null}

                  {request.employeeReply ? (
                    <View style={[styles.message, request.hrReply ? styles.messageNext : null]}>
                      <Text style={styles.messageMeta} numberOfLines={1}>
                        <Text style={styles.messageWho}>
                          {asApprover ? request.employeeName || 'Employee' : 'You'}
                        </Text>
                        {request.employeeReplyAt ? ` · ${dateAndTime(request.employeeReplyAt)}` : ''}
                      </Text>
                      <Text style={styles.messageText}>{request.employeeReply}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Files, both sides of the thread */}
              {files.length > 0 || canAttach ? (
                <View style={styles.card}>
                  <CardHead
                    icon="paperclip"
                    title="Files"
                    right={files.length > 0 ? <Text style={styles.cardCount}>{files.length}</Text> : null}
                  />

                  {mine.length > 0 ? (
                    <>
                      <Text style={styles.groupLabel}>{asApprover ? 'From the employee' : 'Your files'}</Text>
                      {mine.map((f, index) => (
                        <AttachmentRow
                          key={f.id}
                          file={f}
                          onOpen={() => openFile(f)}
                          onRemove={!asApprover && open ? () => removeFile(f) : undefined}
                          last={index === mine.length - 1}
                        />
                      ))}
                    </>
                  ) : null}

                  {fromHr.length > 0 ? (
                    <>
                      <Text style={[styles.groupLabel, mine.length > 0 && styles.groupLabelNext]}>From HR</Text>
                      {fromHr.map((f, index) => (
                        <AttachmentRow
                          key={f.id}
                          file={f}
                          onOpen={() => openFile(f)}
                          onRemove={asApprover ? () => removeFile(f) : undefined}
                          last={index === fromHr.length - 1}
                        />
                      ))}
                    </>
                  ) : null}

                  {canAttach ? (
                    <View style={styles.attachGap}>
                      <AttachButton
                        onPress={() => setSheetOpen(true)}
                        busy={uploading}
                        disabled={mySideCount >= MAX_FILES_PER_SIDE}
                        label={asApprover ? 'Send a file back' : mine.length > 0 ? 'Add another file' : 'Add a file'}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* What happened when */}
              <View style={styles.card}>
                <CardHead icon="timeline-clock-outline" title="Timeline" />
                <View style={styles.timeline}>
                  {steps.map((s, i) => {
                    const last = i === steps.length - 1;
                    return (
                      <View key={s.key} style={styles.step}>
                        <View style={styles.stepRail}>
                          <View style={[styles.stepDot, DOT_STYLE[s.tone]]} />
                          {!last ? <View style={styles.stepLine} /> : null}
                        </View>
                        <View style={[styles.stepText, !last && styles.stepTextGap]}>
                          <Text style={[styles.stepTitle, s.tone === 'waiting' && styles.stepTitleWaiting]}>{s.title}</Text>
                          {s.detail ? <Text style={styles.stepDetail}>{s.detail}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Flat buttons, the same as on the approval card: Reject white with a
                danger border, Approve solid blue. */}
            {showFooter && decidable ? (
              <View style={[styles.footer, { paddingBottom: 10 + insets.bottom }]}>
                <View style={styles.decideSlot}>
                  <DecisionButtons
                    onReject={() => { void reject(); }}
                    onApprove={() => { void approve(); }}
                    acting={deciding}
                    name={request?.employeeName ?? undefined}
                    subject={`${typeForSentence} request`}
                  />
                </View>
              </View>
            ) : null}

            {showFooter && !asApprover ? (
              <View style={[styles.footer, { paddingBottom: 10 + insets.bottom }]}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.reject]}
                  onPress={() => { void cancel(); }}
                  disabled={cancelling}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: cancelling, busy: cancelling }}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color={C.danger} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="close-circle-outline" size={18} color={C.danger} />
                      <Text style={[styles.footerText, styles.rejectText]}>Cancel request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>

      <PickSourceSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} onPick={(source) => { void addFile(source); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerPad: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 60 },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 10 },

  card: { ...CARD_SURFACE, padding: 14 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF3FB', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: C.ink },
  personText: { flex: 1, minWidth: 0 },
  personName: { fontSize: 15, fontWeight: '700', color: C.ink },
  personMeta: { fontSize: 12, color: C.muted, marginTop: 2 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeRowBelow: { marginTop: 12 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700', color: C.ink },

  divider: { height: 1, backgroundColor: C.line, marginVertical: 12 },
  blockLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 3 },
  blockText: { fontSize: 14, lineHeight: 20, color: C.ink },

  reasonBox: { backgroundColor: C.dangerBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 3 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.ink },

  factsCard: { paddingVertical: 4 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 10 },
  factDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  factLabel: { fontSize: 13, color: C.body },
  factValue: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: C.ink, textAlign: 'right' },
  factAction: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 6 },
  factActionText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.blue },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  cardIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.field, borderWidth: 1, borderColor: C.line, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  cardCount: { fontSize: 13, fontWeight: '600', color: C.muted },

  link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 4 },
  linkText: { fontSize: 14, fontWeight: '600', color: C.blue },

  message: { marginTop: 8 },
  messageNext: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  messageMeta: { fontSize: 12, color: C.muted, marginBottom: 3 },
  messageWho: { fontWeight: '700', color: C.body },
  messageText: { fontSize: 14, lineHeight: 20, color: C.ink },

  groupLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 8 },
  groupLabelNext: { marginTop: 12 },
  attachGap: { marginTop: 10 },

  timeline: { marginTop: 10 },
  step: { flexDirection: 'row' },
  stepRail: { width: 16, alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  stepLine: { flex: 1, width: 1, backgroundColor: C.line, marginTop: 4 },
  stepText: { flex: 1, paddingLeft: 8 },
  stepTextGap: { paddingBottom: 14 },
  stepTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: C.ink },
  stepTitleWaiting: { color: C.body },
  stepDetail: { fontSize: 12, color: C.muted, marginTop: 1 },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  // 44pt like the approval card's pair, so the sticky bar and the list match.
  footerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12 },
  reject: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.danger },
  decideSlot: { flex: 1 },
  footerText: { fontSize: 15, fontWeight: '700' },
  rejectText: { color: C.danger },
});

/** The timeline's dot for each kind of step; the waiting one is an open ring. */
const DOT_STYLE = StyleSheet.create({
  done: { backgroundColor: C.body },
  approved: { backgroundColor: APPROVED_GREEN },
  rejected: { backgroundColor: C.danger },
  muted: { backgroundColor: C.muted },
  waiting: { width: 10, height: 10, borderRadius: 5, marginTop: 5, borderWidth: 2, borderColor: PENDING_AMBER, backgroundColor: '#FFFFFF' },
});

export default RequestDetailsScreen;
