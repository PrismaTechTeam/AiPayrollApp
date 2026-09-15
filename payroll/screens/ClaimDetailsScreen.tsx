/**
 * One claim, everything about it: what was bought, what it cost, what happened
 * to it, and the receipt behind it.
 *
 * The screen always re-reads the claim on open. It used to render whichever
 * object the list handed over, so a claim decided while the list was on screen
 * still read as pending, and the Edit and Delete buttons it offered were both
 * alerts saying "coming soon".
 *
 * The same page serves the employee and the approver. Which one you are decides
 * what you can do, never what you can see — an approver deciding a claim needs
 * the same detail the employee filled in.
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
import claimService, { ClaimApplication } from '../api/services/claimService';
import { serverMessage } from '../lib/serverMessage';
import { openSignedUrl } from '../lib/downloadAttachment';
import {
  ClaimState,
  DetailRow,
  ReceiptRow,
  StatusPill,
  claimDate,
  claimIcon,
  claimTint,
  claimWash,
  dateAndTime,
  goTo,
  money,
  shortDate,
  statusOf,
} from '../components/claims/ClaimUi';

type Params = {
  ClaimDetails: {
    /** Preferred. The screen reads the rest itself. */
    claimId?: string;
    /** Older callers passed the whole row; used only as a first paint. */
    claim?: ClaimApplication;
    canApprove?: boolean;
  };
};

export const ClaimDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'ClaimDetails'>>();
  const dialog = useDialog();

  const params = route.params ?? {};
  const canApprove = params.canApprove === true;
  const claimId = params.claimId ?? params.claim?.id ?? '';

  const [claim, setClaim] = useState<ClaimApplication | null>(params.claim ?? null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!claimId) {
      setError('This claim could not be opened.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setClaim(await claimService.getApplication(claimId));
    } catch (err) {
      setError(serverMessage(err, 'Could not load this claim.'));
    } finally {
      setLoading(false);
    }
  }, [claimId]);

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

  const status = statusOf(claim?.status);
  const pending = status === 'PENDING';
  /** Only the person who filed it may change it, and only before it is decided. */
  const mineAndOpen = !canApprove && pending;

  // ── Doing things to it ─────────────────────────────────────────────────

  const openReceipt = async () => {
    try {
      const link = await claimService.getReceiptLink(claimId);
      // A pre-signed URL, not a stream: the bytes come from storage directly and
      // the link is good for minutes, so it is fetched at the moment of the tap.
      await openSignedUrl(link.url, link.fileName);
    } catch (err) {
      await dialog.notify({
        title: 'Could not open the receipt',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    }
  };

  const edit = () => {
    goTo(navigation, 'CreateClaim', { claimId });
  };

  const withdraw = async () => {
    const ok = await dialog.confirm({
      title: 'Withdraw this claim?',
      message: 'It stops waiting for approval and stays on your record as cancelled. You can send a new one any time.',
      confirmText: 'Withdraw',
      cancelText: 'Keep it',
      destructive: true,
      tone: 'warning',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await claimService.withdrawApplication(claimId);
      navigation.goBack();
    } catch (err) {
      await dialog.notify({ title: 'Could not withdraw it', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
      setBusy(false);
    }
  };

  const approve = async () => {
    const ok = await dialog.confirm({
      title: 'Approve this claim?',
      message: `${money(claim?.amount)} to ${claim?.employeeName ?? 'the employee'}. Approving sends it through to payroll.`,
      confirmText: 'Approve',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await claimService.approveClaim(claimId);
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
      title: 'Reject this claim',
      message: 'The employee sees this, so say what would make it claimable.',
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
      await claimService.rejectClaim(claimId, reason);
      await dialog.notify({ title: 'Rejected', tone: 'success' });
      await load();
    } catch (err) {
      await dialog.notify({ title: 'Could not reject', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const tint = claimTint(claim?.claimTypeId ?? null);

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
            <Text style={styles.headerTitle}>Claim</Text>
          </View>
        </View>

        {loading && !claim ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : !claim ? (
          <ClaimState
            icon="file-remove-outline"
            title="Could not open this claim"
            body={error ?? 'It may have been removed.'}
            tone="danger"
            actionLabel="Go back"
            onAction={() => navigation.goBack()}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
          >
            {/* The amount, because that is what the page is about */}
            <View style={styles.card}>
              <View style={styles.heroTop}>
                <View style={[styles.heroIcon, { backgroundColor: claimWash(tint) }]}>
                  <MaterialCommunityIcons name={claimIcon({ name: claim.claimTypeName })} size={24} color={tint} />
                </View>
                <View style={styles.heroHead}>
                  <Text style={styles.heroTitle} numberOfLines={2}>{claim.claimTypeName ?? 'Claim'}</Text>
                  <Text style={styles.heroDate}>{claimDate(claim.transDate)}</Text>
                </View>
                <StatusPill status={claim.status} large />
              </View>

              <Text style={styles.amount}>{money(claim.amount)}</Text>

              {canApprove && claim.employeeName ? (
                <Text style={styles.employee}>
                  {claim.employeeName}
                  {claim.employeeCode ? ` · ${claim.employeeCode}` : ''}
                  {claim.departmentName ? ` · ${claim.departmentName}` : ''}
                </Text>
              ) : null}
            </View>

            {/* What it was for */}
            {claim.description ? (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.cardIcon}>
                    <MaterialCommunityIcons name="text-box-outline" size={20} color={C.blue} />
                  </View>
                  <Text style={styles.cardTitle}>What it was for</Text>
                </View>
                <Text style={styles.body}>{claim.description}</Text>
              </View>
            ) : null}

            {/* The receipt */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons name="paperclip" size={20} color={C.blue} />
                </View>
                <Text style={styles.cardTitle}>Receipt</Text>
              </View>

              {claim.attachmentFileName ? (
                <ReceiptRow fileName={claim.attachmentFileName} onOpen={openReceipt} hint="Opens for a few minutes" />
              ) : (
                <Text style={styles.body}>
                  {canApprove ? 'No receipt was attached to this claim.' : 'You did not attach a receipt to this claim.'}
                </Text>
              )}

              {claim.receiptNo ? <DetailRow label="Receipt number" value={claim.receiptNo} /> : null}
            </View>

            {/* The trail */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons name="history" size={20} color={C.blue} />
                </View>
                <Text style={styles.cardTitle}>History</Text>
              </View>

              <DetailRow label="Sent" value={shortDate(claim.createdAt)} />
              {claim.submittedFrom ? <DetailRow label="From" value={friendlySource(claim.submittedFrom)} /> : null}
              {claim.approvedAt ? (
                <DetailRow
                  label={status === 'REJECTED' ? 'Rejected' : 'Approved'}
                  value={dateAndTime(claim.approvedAt) || shortDate(claim.approvedAt)}
                />
              ) : null}
              {claim.approvedByName ? <DetailRow label="Decided by" value={claim.approvedByName} /> : null}
              {pending ? <DetailRow label="Now" value="Waiting for approval" /> : null}
            </View>

            {/* Why it was turned down */}
            {status === 'REJECTED' && claim.rejectionReason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason for rejection</Text>
                <Text style={styles.reasonText}>{claim.rejectionReason}</Text>
              </View>
            ) : null}

            {/* What you can do about it */}
            {mineAndOpen ? (
              <View style={styles.actions}>
                <View style={styles.half}>
                  <PrimaryButton icon="pencil-outline" label="Edit" onPress={edit} variant="outline" disabled={busy} />
                </View>
                <View style={styles.half}>
                  <PrimaryButton icon="close-circle-outline" label="Withdraw" onPress={() => { void withdraw(); }} variant="danger" loading={busy} />
                </View>
              </View>
            ) : null}

            {canApprove && pending ? (
              <View style={styles.actions}>
                <View style={styles.half}>
                  <PrimaryButton icon="close" label="Reject" onPress={() => { void reject(); }} variant="danger" disabled={busy} />
                </View>
                <View style={styles.half}>
                  <PrimaryButton icon="check" label="Approve" onPress={() => { void approve(); }} loading={busy} />
                </View>
              </View>
            ) : null}

            {!canApprove && !pending ? (
              <Text style={styles.closed}>
                This claim is {status.toLowerCase()}, so it can no longer be changed.
              </Text>
            ) : null}

            {error && claim ? <Text style={styles.stale}>{error}</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

/** MOBILE / WEB as the server stores it, in words a person would use. */
function friendlySource(value: string): string {
  const key = value.toUpperCase();
  if (key === 'MOBILE') return 'The app';
  if (key === 'WEB') return 'The web dashboard';
  return value;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  heroHead: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  heroDate: { fontSize: 13, color: C.body, marginTop: 2 },
  amount: { fontSize: 34, fontWeight: '800', color: C.ink, marginTop: 14, fontVariant: ['tabular-nums'] },
  employee: { fontSize: 13, color: C.body, marginTop: 6 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: C.ink },
  body: { fontSize: 14, lineHeight: 21, color: C.body },

  reasonBox: { backgroundColor: C.dangerBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.dangerLine },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 4 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.body },

  actions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },

  closed: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 20 },
  stale: { fontSize: 12, color: C.danger, textAlign: 'center', lineHeight: 17 },
});

export default ClaimDetailsScreen;
