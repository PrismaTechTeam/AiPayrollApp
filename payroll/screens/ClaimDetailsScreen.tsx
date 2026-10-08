/**
 * One claim, everything about it: who claimed, what was bought, what it cost,
 * the receipt behind it, and what happened to it.
 *
 * The screen always re-reads the claim on open. It used to render whichever
 * object the list handed over, so a claim decided while the list was on screen
 * still read as pending, and the Edit and Delete buttons it offered were both
 * alerts saying "coming soon". The handed-over row is still used as a first
 * paint, so a claim opened from the queue shows at once; the buttons wait for
 * the server's copy.
 *
 * The same page serves the employee and the approver. Which one you are decides
 * what you can do, never what you can see — an approver deciding a claim needs
 * the same detail the employee filled in. Being sent here as an approver is not
 * enough to decide: your own claim stays yours (Edit, Withdraw), because nobody
 * approves their own item.
 *
 * The decision buttons sit in a fixed white bar rather than at the end of the
 * scroll. They were below the fold on a normal phone, so an approver scrolled
 * down on every single claim to find Approve.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
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
import { useDialog } from '../components/ui/AppDialog';
import { DecisionButtons } from '../components/ui/ApprovalCard';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { STATUS_LOOK } from '../components/requests/RequestUi';
import claimService, { ClaimApplication, ReceiptLink } from '../api/services/claimService';
import { serverMessage, statusOfError } from '../lib/serverMessage';
import { openSignedUrl } from '../lib/downloadAttachment';
import {
  ClaimState,
  DetailRow,
  ReceiptRow,
  StatusPill,
  allowance,
  allowancePeriod,
  claimDate,
  claimTint,
  dateAndTime,
  daysSince,
  goTo,
  initials,
  money,
  shortDate,
  statusOf,
  tighterAllowance,
} from '../components/claims/ClaimUi';

type Params = {
  ClaimDetails: {
    /** Preferred. The screen reads the rest itself. */
    claimId?: string;
    /** A whole list row, used only as a first paint. */
    claim?: ClaimApplication;
    canApprove?: boolean;
  };
};

/**
 * The handed-over row, but only when it is a whole one.
 *
 * A notification tap arrives with `claim: { id }` and nothing else. Painted as
 * a claim, that read "Pending, RM 0.00, you did not attach a receipt" with Edit
 * and Withdraw on it -- about a claim the notification had just said was
 * approved -- until the real one loaded, and for good if it never did.
 */
function seedFrom(value: unknown): ClaimApplication | null {
  const row = value as Partial<ClaimApplication> | null | undefined;
  return row && typeof row.id === 'string' && typeof row.status === 'string' && typeof row.amount === 'number'
    ? (row as ClaimApplication)
    : null;
}

type LoadError = { message: string; status?: number };

/** Which button's call is in flight, so its spinner shows there and nowhere else. */
type Busy = 'approve' | 'reject' | 'withdraw' | null;

/** The receipt link, when it was fetched, and for which file (an edit can swap the receipt). */
type HeldLink = ReceiptLink & { at: number; forFile: string };

const IMAGE_RECEIPT = /\.(jpe?g|png)$/i;

/** Still good to show: a minute's margin under what the server promised. */
function fresh(link: HeldLink): boolean {
  const lifeMs = (Math.max(link.expiresInMinutes, 1) - 1) * 60_000;
  return Date.now() - link.at < lifeMs;
}

/** Year and month in Malaysia time, for matching against the allowance the server counts. */
function mytYearMonth(): { year: number; month: number } {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export const ClaimDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'ClaimDetails'>>();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { user } = usePayrollAuth();
  const access = useApproverAccess();

  const params = route.params ?? {};
  const canApprove = params.canApprove === true;
  const claimId = params.claimId ?? params.claim?.id ?? '';

  const [claim, setClaim] = useState<ClaimApplication | null>(() => seedFrom(params.claim));
  /** Buttons wait for the server's copy: a first paint can be stale, and acting on it is not safe. */
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  /**
   * Held from the moment a dialog opens until its call is back. The dialogs
   * queue, so a double tap on Approve stacked two of them and confirming both
   * sent a second decision that came back as an error.
   */
  const asking = useRef(false);

  const [receipt, setReceipt] = useState<HeldLink | null>(null);
  const [viewer, setViewer] = useState<'closed' | 'loading' | 'shown' | 'failed'>('closed');

  const load = useCallback(async () => {
    if (!claimId) {
      setError({ message: 'This claim could not be opened.', status: 404 });
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setClaim(await claimService.getApplication(claimId));
      setLoadedOnce(true);
    } catch (err) {
      setError({ message: serverMessage(err, 'Could not load this claim.'), status: statusOfError(err) });
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

  const retry = () => {
    setLoading(true);
    void load();
  };

  /**
   * Back to where this was opened from, but only if this page is still the one
   * on screen. A decision is a network call; someone who pressed Back while it
   * ran is already on the list, and a late goBack() then popped the list too and
   * dropped them on Home.
   */
  const leave = () => {
    if (navigation.isFocused()) navigation.goBack();
  };

  const status = statusOf(claim?.status);
  const pending = status === 'PENDING';
  /** The detail always carries the employee, so this holds on today's server and the reworked one. */
  const myEmployeeId = user?.employeeId ?? null;
  const mine = myEmployeeId !== null && claim?.employeeId === myEmployeeId;
  /** Shown as the approver sees it: whose claim, and the decision bar. */
  const asApprover = canApprove && !mine;
  /** Only the person who filed it may change it, and only before it is decided. */
  const mineAndOpen = loadedOnce && pending && (mine || !canApprove);
  // canApprove comes from how the page was opened, and a notification sets it from the type
  // alone ("claim submitted"), so it is not proof of the right: the buttons also need
  // CLAIM_APPLICATION.APPROVE, or they would answer every tap with a 403.
  const decidable = loadedOnce && pending && asApprover && access.claims;

  const fileName = claim?.attachmentFileName ?? null;
  const isImage = !!fileName && IMAGE_RECEIPT.test(fileName);

  // A photo receipt is fetched once the claim is in, so its thumbnail is on the
  // row and a tap shows it straight away. Checking the receipt is the heart of
  // approving a claim, and it used to mean a download and the share sheet.
  useEffect(() => {
    if (!loadedOnce || !isImage || !fileName || receipt?.forFile === fileName) return;
    let cancelled = false;
    claimService
      .getReceiptLink(claimId)
      .then((link) => {
        if (!cancelled && link.url) setReceipt({ ...link, at: Date.now(), forFile: fileName });
      })
      // No thumbnail is not an error: the row still opens the receipt the old way.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadedOnce, isImage, fileName, claimId, receipt?.forFile]);

  // ── Doing things to it ─────────────────────────────────────────────────

  /** Download and hand to the phone: the way to open a PDF, or to keep a photo. */
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

  /** A photo opens full screen in the app; anything else goes the download way. */
  const showReceipt = async () => {
    if (!isImage || !fileName) {
      await openReceipt();
      return;
    }
    if (!receipt || receipt.forFile !== fileName || !fresh(receipt)) {
      try {
        const link = await claimService.getReceiptLink(claimId);
        setReceipt({ ...link, at: Date.now(), forFile: fileName });
      } catch (err) {
        await dialog.notify({
          title: 'Could not open the receipt',
          message: serverMessage(err, 'Please try again.'),
          tone: 'danger',
        });
        return;
      }
    }
    setViewer('loading');
  };

  const edit = () => {
    goTo(navigation, 'CreateClaim', { claimId });
  };

  const withdraw = async () => {
    if (asking.current) return;
    asking.current = true;
    try {
      const ok = await dialog.confirm({
        title: 'Withdraw this claim?',
        message: 'It stops waiting for approval and stays on your record as cancelled. You can send a new one any time.',
        confirmText: 'Withdraw',
        cancelText: 'Keep it',
        destructive: true,
        tone: 'warning',
      });
      if (!ok) return;

      setBusy('withdraw');
      try {
        await claimService.withdrawApplication(claimId);
        leave();
      } catch (err) {
        await dialog.notify({ title: 'Could not withdraw it', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        // HR may have decided it in the meantime; re-read so the buttons match.
        await load();
        setBusy(null);
      }
    } finally {
      asking.current = false;
    }
  };

  /**
   * Back to the queue on success, which re-reads on focus and drops the claim.
   * The "Approved" box this used to raise, then a page with nothing left to do
   * on it, cost two extra taps per claim and made deciding from here slower
   * than deciding from the list.
   */
  const approve = async () => {
    if (asking.current) return;
    asking.current = true;
    try {
      const ok = await dialog.confirm({
        title: 'Approve this claim?',
        message: `${money(claim?.amount)} to ${claim?.employeeName ?? 'the employee'}. Approving sends it through to payroll.`,
        confirmText: 'Approve',
      });
      if (!ok) return;

      setBusy('approve');
      try {
        await claimService.approveClaim(claimId);
        leave();
      } catch (err) {
        await dialog.notify({ title: 'Could not approve', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        // Usually someone else got there first, or it was withdrawn: re-read so the
        // page says so instead of offering the same dead buttons again.
        await load();
        setBusy(null);
      }
    } finally {
      asking.current = false;
    }
  };

  const reject = async () => {
    if (asking.current) return;
    asking.current = true;
    try {
      const reason = await dialog.prompt({
        title: 'Reject this claim',
        message: `${claim?.employeeName ?? 'The employee'} sees this, so say what would make it claimable.`,
        placeholder: 'Reason for rejection',
        confirmText: 'Reject',
        required: true,
        multiline: true,
        maxLength: 1000,
        destructive: true,
      });
      if (!reason) return;

      setBusy('reject');
      try {
        await claimService.rejectClaim(claimId, reason);
        leave();
      } catch (err) {
        await dialog.notify({ title: 'Could not reject', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
        await load();
        setBusy(null);
      }
    } finally {
      asking.current = false;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  /** Gone or not theirs to see: trying again cannot help, so the way on is back. */
  const unreachable = error?.status === 403 || error?.status === 404;

  const subtitle = !claim ? '' : asApprover ? claim.employeeName ?? '' : STATUS_LOOK[status].label;

  /**
   * What the claimant has left of this type's allowance, before this claim.
   * Only when the server sends it (the reworked one will, to approvers), and
   * only for the periods the claim was spent in: the balance is this month's and
   * this year's, so it says nothing about a receipt from last month. The claim's
   * own amount is handed back because a pending claim is already counted in it.
   */
  const left = (() => {
    const b = claim?.balance;
    if (!claim || !b || !pending || !asApprover) return null;
    const spent = /^(\d{4})-(\d{2})/.exec(claim.transDate);
    if (!spent) return null;
    const now = mytYearMonth();
    const sameYear = Number(spent[1]) === now.year;
    const sameMonth = sameYear && Number(spent[2]) === now.month;
    return tighterAllowance(
      sameMonth ? allowance(b, 'month', claim.amount) : null,
      sameYear ? allowance(b, 'year', claim.amount) : null,
    );
  })();

  const steps = claim ? timeline(claim) : [];
  const footerShown = mineAndOpen || decidable;
  const footerPad = { paddingBottom: Math.max(insets.bottom, 10) };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      {/* Top only: the white decision bar runs under the home indicator itself. */}
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>Claim</Text>
            {subtitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        {loading && !claim ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : !claim ? (
          <View style={styles.centre}>
            {unreachable ? (
              <ClaimState
                icon="file-remove-outline"
                title="Could not open this claim"
                body={error?.message ?? 'It may have been removed.'}
                tone="danger"
                actionLabel="Go back"
                onAction={() => navigation.goBack()}
              />
            ) : (
              <ClaimState
                icon="cloud-off-outline"
                title="Could not load this claim"
                body={error?.message ?? 'Please try again.'}
                tone="danger"
                actionLabel="Try again"
                onAction={retry}
              />
            )}
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.scroll,
                { paddingBottom: footerShown ? 16 : Math.max(insets.bottom, 12) + 16 },
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            >
              {/* Summary: who (for an approver), what, how much, when */}
              <View style={styles.card}>
                {asApprover ? (
                  <>
                    <View style={styles.personRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(claim.employeeName)}</Text>
                      </View>
                      <View style={styles.personText}>
                        <Text style={styles.personName} numberOfLines={1}>{claim.employeeName ?? 'Employee'}</Text>
                        {claim.employeeCode || claim.departmentName ? (
                          <Text style={styles.personMeta} numberOfLines={2}>
                            {[claim.employeeCode, claim.departmentName].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                      <StatusPill status={claim.status} />
                    </View>
                    <View style={styles.rule} />
                    <View style={styles.typeRow}>
                      <View style={[styles.typeDot, { backgroundColor: claimTint(claim.claimTypeId) }]} />
                      <Text style={styles.typeText} numberOfLines={2}>{claim.claimTypeName ?? 'Claim'}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.typeRow}>
                    <View style={[styles.typeDot, { backgroundColor: claimTint(claim.claimTypeId) }]} />
                    <Text style={[styles.typeText, styles.typeTextLead]} numberOfLines={2}>{claim.claimTypeName ?? 'Claim'}</Text>
                    <StatusPill status={claim.status} />
                  </View>
                )}

                <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {money(claim.amount)}
                </Text>
                <Text style={styles.spent}>Spent {claimDate(claim.transDate)}</Text>

                {left ? (
                  <Text style={[styles.allowance, claim.amount > left.remaining && styles.allowanceOver]}>
                    {claim.amount > left.remaining
                      ? `Over the limit by ${money(claim.amount - left.remaining)} · ${money(left.remaining)} left ${allowancePeriod(left)}`
                      : `${money(left.remaining)} left ${allowancePeriod(left)} of ${money(left.limit)}`}
                  </Text>
                ) : null}
              </View>

              {/* Why it was turned down -- straight under the amount, because for a
                  rejected claim it is the one thing the employee opened this for */}
              {status === 'REJECTED' && claim.rejectionReason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Reason for rejection</Text>
                  <Text style={styles.reasonText}>{claim.rejectionReason}</Text>
                </View>
              ) : null}

              {/* What it was for and the receipt behind it */}
              <View style={styles.card}>
                {claim.description ? (
                  <>
                    <Text style={styles.section}>WHAT IT WAS FOR</Text>
                    <Text style={styles.body}>{claim.description}</Text>
                    <View style={styles.rule} />
                  </>
                ) : null}

                <Text style={styles.section}>RECEIPT</Text>
                {fileName ? (
                  <ReceiptRow
                    fileName={fileName}
                    onOpen={showReceipt}
                    hint={isImage ? 'Tap to view' : 'Opens for a few minutes'}
                    actionIcon={isImage ? 'eye-outline' : 'tray-arrow-down'}
                    thumbUri={isImage && receipt?.forFile === fileName ? receipt.url : undefined}
                  />
                ) : (
                  <Text style={styles.body}>{asApprover ? 'No receipt attached.' : 'You did not attach a receipt.'}</Text>
                )}
                {claim.receiptNo ? <DetailRow label="Receipt number" value={claim.receiptNo} /> : null}
                {claim.receiptDate ? <DetailRow label="Receipt date" value={claimDate(claim.receiptDate)} /> : null}
              </View>

              {/* What happened to it, in order */}
              {steps.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.section}>HISTORY</Text>
                  {steps.map((s, i) => (
                    <View key={s.key} style={styles.step}>
                      <View style={styles.stepRail}>
                        <View style={[styles.stepDot, { backgroundColor: s.color }]} />
                        {i < steps.length - 1 ? <View style={styles.stepLine} /> : null}
                      </View>
                      <View style={[styles.stepBody, i === steps.length - 1 && styles.stepBodyLast]}>
                        <Text style={styles.stepTitle}>{s.title}</Text>
                        {s.when ? <Text style={styles.stepWhen}>{s.when}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {error ? <Text style={styles.stale}>{error.message}</Text> : null}
            </ScrollView>

            {/* What you can do about it */}
            {mineAndOpen ? (
              <View style={[styles.footer, footerPad]}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPlain]}
                  onPress={edit}
                  disabled={busy !== null}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={C.ink} />
                  <Text style={[styles.buttonText, { color: C.ink }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonDanger]}
                  onPress={() => { void withdraw(); }}
                  disabled={busy !== null}
                  accessibilityRole="button"
                >
                  {busy === 'withdraw' ? (
                    <ActivityIndicator size="small" color={C.danger} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="undo-variant" size={18} color={C.danger} />
                      <Text style={[styles.buttonText, { color: C.danger }]}>Withdraw</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {decidable ? (
              // The same pair as the approval list, so a decision looks alike in both places.
              <View style={[styles.footer, footerPad]}>
                <View style={styles.decideSlot}>
                  <DecisionButtons
                    onReject={() => { void reject(); }}
                    onApprove={() => { void approve(); }}
                    acting={busy === 'approve' || busy === 'reject' ? busy : null}
                    disabled={busy !== null}
                    name={claim?.employeeName ?? undefined}
                    subject="claim"
                  />
                </View>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>

      {/* The receipt photo, full screen. Share keeps the old download-and-send way. */}
      <Modal
        visible={viewer !== 'closed'}
        animationType="fade"
        onRequestClose={() => setViewer('closed')}
        statusBarTranslucent
      >
        <View style={styles.viewer}>
          <View style={[styles.viewerBar, { paddingTop: insets.top + 4 }]}>
            <TouchableOpacity
              style={styles.viewerButton}
              onPress={() => { void openReceipt(); }}
              accessibilityRole="button"
              accessibilityLabel="Share or save the receipt"
            >
              <MaterialCommunityIcons name="share-variant-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.viewerTitle} numberOfLines={1}>{fileName ?? 'Receipt'}</Text>
            <TouchableOpacity
              style={styles.viewerButton}
              onPress={() => setViewer('closed')}
              accessibilityRole="button"
              accessibilityLabel="Close the receipt"
            >
              <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.viewerBody}>
            {receipt && viewer !== 'failed' ? (
              <Image
                source={{ uri: receipt.url }}
                style={styles.viewerImage}
                resizeMode="contain"
                onLoad={() => setViewer((v) => (v === 'loading' ? 'shown' : v))}
                onError={() => setViewer('failed')}
                accessibilityLabel="Receipt"
              />
            ) : null}
            {viewer === 'loading' ? (
              <View style={styles.viewerOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : null}
            {viewer === 'failed' ? (
              <View style={styles.viewerOverlay}>
                <Text style={styles.viewerFailed}>Could not show the receipt.</Text>
                <TouchableOpacity style={styles.viewerRetry} onPress={() => { void openReceipt(); }} accessibilityRole="button">
                  <Text style={styles.viewerRetryText}>Open the file</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

type Step = { key: string; title: string; when: string; color: string };

/**
 * Sent, then waiting or decided. A claim has one approval step, so this is two
 * lines; it says who decided and when, and for a pending claim how long it has
 * been waiting, which is what an approver weighs first.
 */
function timeline(claim: ClaimApplication): Step[] {
  const status = statusOf(claim.status);
  if (status === 'DRAFT') return [];
  const steps: Step[] = [
    {
      key: 'sent',
      title: claim.submittedFrom ? `Submitted from ${friendlySource(claim.submittedFrom)}` : 'Submitted',
      when: dateAndTime(claim.createdAt) || shortDate(claim.createdAt),
      color: C.body,
    },
  ];
  if (status === 'PENDING') {
    const days = daysSince(claim.createdAt);
    steps.push({
      key: 'waiting',
      title: 'Waiting for approval',
      when: days === null ? '' : days === 0 ? 'Since today' : `${days} ${days === 1 ? 'day' : 'days'} so far`,
      color: C.blue,
    });
  } else if (status === 'APPROVED' || status === 'REJECTED') {
    const verb = status === 'APPROVED' ? 'Approved' : 'Rejected';
    steps.push({
      key: 'decided',
      title: claim.approvedByName ? `${verb} by ${claim.approvedByName}` : verb,
      when: claim.approvedAt ? dateAndTime(claim.approvedAt) || shortDate(claim.approvedAt) : '',
      color: STATUS_LOOK[status].fg,
    });
  } else {
    steps.push({ key: 'withdrawn', title: 'Withdrawn', when: '', color: C.muted });
  }
  return steps;
}

/** MOBILE / WEB as the server stores it, in words a person would use. */
function friendlySource(value: string): string {
  const key = value.toUpperCase();
  if (key === 'MOBILE') return 'the app';
  if (key === 'WEB') return 'the web dashboard';
  return value;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, left: 64, right: 64, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.muted, marginTop: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: C.ink },
  personText: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '700', color: C.ink },
  personMeta: { fontSize: 13, color: C.muted, marginTop: 1 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
  typeTextLead: { fontSize: 15, fontWeight: '700' },
  amount: { fontSize: 24, fontWeight: '700', color: C.ink, marginTop: 8, fontVariant: ['tabular-nums'] },
  spent: { fontSize: 13, color: C.body, marginTop: 2 },
  allowance: { fontSize: 13, color: C.body, marginTop: 6 },
  allowanceOver: { color: C.danger, fontWeight: '600' },

  section: { fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 0.8, marginBottom: 6 },
  rule: { height: 1, backgroundColor: C.line, marginVertical: 12 },
  body: { fontSize: 14, lineHeight: 20, color: C.body },

  reasonBox: { backgroundColor: C.dangerBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.dangerLine },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 4 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.body },

  step: { flexDirection: 'row', gap: 12 },
  stepRail: { width: 10, alignItems: 'center' },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  stepLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 4 },
  stepBody: { flex: 1, paddingBottom: 14 },
  stepBodyLast: { paddingBottom: 0 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: C.ink },
  stepWhen: { fontSize: 12, color: C.muted, marginTop: 2 },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12 },
  buttonPlain: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line },
  buttonDanger: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.danger },
  buttonApprove: { backgroundColor: C.blue },
  decideSlot: { flex: 1 },
  buttonText: { fontSize: 15, fontWeight: '600' },

  stale: { fontSize: 12, color: C.danger, textAlign: 'center', lineHeight: 17 },

  viewer: { flex: 1, backgroundColor: '#0F1B2D' },
  viewerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 4 },
  viewerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewerTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  viewerBody: { flex: 1 },
  viewerImage: { flex: 1, width: '100%' },
  viewerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  viewerFailed: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  viewerRetry: { marginTop: 14, minHeight: 44, justifyContent: 'center', paddingHorizontal: 22, borderRadius: 12, backgroundColor: C.blue },
  viewerRetryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});

export default ClaimDetailsScreen;
