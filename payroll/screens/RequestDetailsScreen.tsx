/**
 * Request Details
 * One request, both sides of it: what was asked, the files that came with it,
 * HR's reply, and the files HR sent back.
 *
 * The screen always re-fetches on open. It used to render whatever object the
 * list handed it, so a request decided while the list was on screen still read
 * as pending, and an attachment added from the web never appeared at all.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import requestService, { EmployeeRequest, RequestAttachment } from '../api/services/requestService';
import { openAttachment } from '../lib/downloadAttachment';
import { pickFile, rejectionReason, MAX_FILES_PER_SIDE, type PickSource, type PickedFile } from '../lib/requestAttachments';
import { serverMessage } from '../lib/serverMessage';
import {
  StatusPill,
  AttachmentRow,
  AttachButton,
  PickSourceSheet,
  statusOf,
  shortDate,
  dateAndTime,
} from '../components/requests/RequestUi';

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

  const params = route.params ?? {};
  const canApprove = params.canApprove === true;
  const requestId = params.requestId ?? params.request?.id ?? '';

  const [request, setRequest] = useState<EmployeeRequest | null>(params.request ?? null);
  const [files, setFiles] = useState<RequestAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) {
      setError('This request could not be opened.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      if (canApprove) {
        // The approver reads through the HR endpoints, which are gated on the
        // access right rather than on owning the record.
        const [detail, attachments] = await Promise.all([
          requestService.getRequestById(requestId),
          requestService.getAttachmentsAsApprover(requestId),
        ]);
        setRequest(detail);
        setFiles(attachments);
      } else {
        const detail = await requestService.getApplication(requestId);
        setRequest(detail);
        setFiles(detail.attachments ?? []);
      }
    } catch (err) {
      setError(serverMessage(err, 'Could not load this request.'));
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

  const status = statusOf(request?.status);
  const open = status === 'PENDING' || status === 'DRAFT';
  const mine = files.filter((f) => f.uploadedByRole === 'EMPLOYEE');
  const fromHr = files.filter((f) => f.uploadedByRole === 'HR');
  const myCount = canApprove ? fromHr.length : mine.length;
  const canAttach = canApprove ? true : open;

  const contentUrl = useMemo(
    () => (canApprove ? requestService.approverAttachmentContentUrl : requestService.attachmentContentUrl),
    [canApprove],
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
    setSheetOpen(false);
    if (myCount >= MAX_FILES_PER_SIDE) {
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
      const created = canApprove
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
      if (canApprove) await requestService.deleteAttachmentAsApprover(file.id);
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

  const approve = async () => {
    const ok = await dialog.confirm({
      title: 'Approve this request?',
      message: `${request?.employeeName ?? 'The employee'} will be told straight away.`,
      confirmText: 'Approve',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await requestService.approveRequest(requestId);
      await dialog.notify({ title: 'Approved', tone: 'success' });
      await load();
    } catch (err) {
      await dialog.notify({ title: 'Could not approve', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    const reason = await dialog.prompt({
      title: 'Reject this request',
      message: 'The employee sees this, so say what would make it approvable.',
      placeholder: 'Reason for rejection',
      confirmText: 'Reject',
      required: true,
      multiline: true,
      maxLength: 1000,
      destructive: true,
    });
    if (!reason) return;

    setBusy(true);
    try {
      await requestService.rejectRequest(requestId, reason);
      await dialog.notify({ title: 'Rejected', tone: 'success' });
      await load();
    } catch (err) {
      await dialog.notify({ title: 'Could not reject', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const reply = async () => {
    const message = await dialog.prompt({
      title: request?.hrReply ? 'Edit your reply' : 'Reply to the employee',
      message: 'They see this on their phone. Leave it empty to remove an existing reply.',
      placeholder: 'e.g. Collect the letter from level 3 after Tuesday.',
      initialValue: request?.hrReply ?? '',
      confirmText: 'Send',
      multiline: true,
      maxLength: 2000,
    });
    if (message === null) return;

    setBusy(true);
    try {
      await requestService.replyToRequest(requestId, message);
      await load();
    } catch (err) {
      await dialog.notify({ title: 'Could not send the reply', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const ok = await dialog.confirm({
      title: 'Cancel this request?',
      message: 'It will be withdrawn. You can submit a new one any time.',
      confirmText: 'Yes, cancel',
      cancelText: 'Keep it',
      destructive: true,
      tone: 'warning',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await requestService.cancelApplication(requestId);
      navigation.goBack();
    } catch (err) {
      await dialog.notify({ title: 'Could not cancel', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
      setBusy(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Request</Text>
          </View>
        </View>

        {loading && !request ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : !request ? (
          <View style={styles.center}>
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>Could not open this request</Text>
              <Text style={styles.emptyBody}>{error ?? 'It may have been removed.'}</Text>
              <View style={styles.gap} />
              <PrimaryButton label="Go back" onPress={() => navigation.goBack()} variant="outline" />
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
          >
            {/* Heading */}
            <View style={styles.card}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>{request.requestTypeName || request.requestType}</Text>
                <StatusPill status={request.status} large />
              </View>
              {canApprove && request.employeeName ? (
                <Text style={styles.subtitle}>
                  {request.employeeName}
                  {request.employeeCode ? ` · ${request.employeeCode}` : ''}
                  {request.departmentName ? ` · ${request.departmentName}` : ''}
                </Text>
              ) : null}

              <View style={styles.divider} />
              <Row label="Submitted" value={shortDate(request.createdAt)} />
              {request.reviewedAt ? <Row label="Decided" value={shortDate(request.reviewedAt)} /> : null}

              {request.notes ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.blockLabel}>Notes</Text>
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

            {/* HR's reply */}
            {request.hrReply || canApprove ? (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.cardIcon}>
                    <MaterialCommunityIcons name="message-text-outline" size={20} color={C.blue} />
                  </View>
                  <Text style={styles.cardTitle}>Reply from HR</Text>
                </View>

                {request.hrReply ? (
                  <>
                    <Text style={styles.replyText}>{request.hrReply}</Text>
                    <Text style={styles.replyMeta}>
                      {request.hrReplyByName ? `${request.hrReplyByName} · ` : ''}
                      {dateAndTime(request.hrReplyAt)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.blockText}>No reply yet.</Text>
                )}

                {canApprove ? (
                  <>
                    <View style={styles.gap} />
                    <PrimaryButton
                      icon={request.hrReply ? 'pencil-outline' : 'reply-outline'}
                      label={request.hrReply ? 'Edit reply' : 'Write a reply'}
                      onPress={() => { void reply(); }}
                      variant="outline"
                      loading={busy}
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            {/* Files from the employee */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons name="paperclip" size={20} color={C.blue} />
                </View>
                <Text style={styles.cardTitle}>{canApprove ? 'From the employee' : 'Your files'}</Text>
                {mine.length > 0 ? <Text style={styles.cardCount}>{mine.length}</Text> : null}
              </View>

              {mine.length === 0 ? (
                <Text style={styles.blockText}>No files attached.</Text>
              ) : (
                mine.map((f, index) => (
                  <AttachmentRow
                    key={f.id}
                    file={f}
                    onOpen={() => openFile(f)}
                    onRemove={!canApprove && open ? () => removeFile(f) : undefined}
                    last={index === mine.length - 1}
                  />
                ))
              )}

              {!canApprove && canAttach ? (
                <>
                  <View style={styles.gap} />
                  <AttachButton onPress={() => setSheetOpen(true)} busy={uploading} disabled={mine.length >= MAX_FILES_PER_SIDE} />
                </>
              ) : null}
              {!canApprove && !open ? (
                <Text style={styles.lockedNote}>
                  This request is {statusOf(request.status).toLowerCase()}, so its files can no longer be changed.
                </Text>
              ) : null}
            </View>

            {/* Files from HR */}
            {fromHr.length > 0 || canApprove ? (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={[styles.cardIcon, styles.cardIconHr]}>
                    <MaterialCommunityIcons name="file-send-outline" size={20} color="#7C3AED" />
                  </View>
                  <Text style={styles.cardTitle}>From HR</Text>
                  {fromHr.length > 0 ? <Text style={styles.cardCount}>{fromHr.length}</Text> : null}
                </View>

                {fromHr.length === 0 ? (
                  <Text style={styles.blockText}>
                    {canApprove ? 'Attach a letter or a form to send back.' : 'Nothing sent back yet.'}
                  </Text>
                ) : (
                  fromHr.map((f, index) => (
                    <AttachmentRow
                      key={f.id}
                      file={f}
                      onOpen={() => openFile(f)}
                      onRemove={canApprove ? () => removeFile(f) : undefined}
                      last={index === fromHr.length - 1}
                    />
                  ))
                )}

                {canApprove ? (
                  <>
                    <View style={styles.gap} />
                    <AttachButton
                      onPress={() => setSheetOpen(true)}
                      busy={uploading}
                      disabled={fromHr.length >= MAX_FILES_PER_SIDE}
                      label="Send a file back"
                    />
                  </>
                ) : null}
              </View>
            ) : null}

            {/* Actions */}
            {canApprove && status === 'PENDING' ? (
              <View style={styles.actions}>
                <View style={styles.half}>
                  <PrimaryButton icon="close" label="Reject" onPress={() => { void reject(); }} variant="danger" disabled={busy} />
                </View>
                <View style={styles.half}>
                  <PrimaryButton icon="check" label="Approve" onPress={() => { void approve(); }} loading={busy} />
                </View>
              </View>
            ) : null}

            {!canApprove && status === 'PENDING' ? (
              <PrimaryButton icon="close-circle-outline" label="Cancel request" onPress={() => { void cancel(); }} variant="danger" loading={busy} />
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

      <PickSourceSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} onPick={(source) => { void addFile(source); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  gap: { height: 12 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: C.ink },
  subtitle: { fontSize: 13, color: C.body, marginTop: 6 },

  divider: { height: 1, backgroundColor: C.line, marginVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 14, color: C.body },
  rowValue: { fontSize: 14, fontWeight: '700', color: C.ink },

  blockLabel: { fontSize: 12, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginBottom: 4 },
  blockText: { fontSize: 14, lineHeight: 21, color: C.body },

  reasonBox: { backgroundColor: C.dangerBg, borderRadius: 14, padding: 14, marginTop: 14 },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 4 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.body },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  cardIconHr: { backgroundColor: '#F1EAFE' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: C.ink },
  cardCount: { fontSize: 13, fontWeight: '700', color: C.muted },

  replyText: { fontSize: 15, lineHeight: 22, color: C.ink },
  replyMeta: { fontSize: 12, color: C.muted, marginTop: 8 },

  lockedNote: { fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 17 },

  actions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },

  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center', marginTop: 6 },
});

export default RequestDetailsScreen;
