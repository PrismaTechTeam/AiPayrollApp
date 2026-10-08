/**
 * Join request
 * One request to join a company and what HR made of it. Opened straight after
 * sending one, from Home's "Waiting for HR" card, and from any row of Your
 * Requests. While it waits it checks again every 30 seconds; when HR approves,
 * it moves the person into the company.
 *
 * What was wrong before, so it is not reintroduced:
 * - On APPROVED it called refreshAuthState, whose identity changed with every
 *   write, which re-ran this screen's check, which called it again — an endless
 *   request loop until the API answered 429. The approval is now handled once.
 * - "Taking you in…" never did: this route exists in every navigator group, so it
 *   survived the switch to the signed-in screens. It now navigates explicitly.
 * - Back reset to "UserHome", which the signed-in group does not register, so the
 *   arrow, "Cancel" and "Try another company" did nothing for anyone who already
 *   had a company.
 * - CANCELLED was not a known status and crashed the page.
 * - It showed "Pending" with a live Cancel button before the first answer, and
 *   forever when offline. Loading, failed and each status are now their own state.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StackActions, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import companyService, { JoinRequest } from '../api/services/companyService';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton, { type IconName } from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { AccountPage, Card, ErrorLine, LoadFailed } from '../components/account/AccountUi';
import { newestFirst, statusKey, whenText, type JoinStatus } from '../lib/joinRequests';
import { serverMessage } from '../lib/serverMessage';
import type { RootStackParamList } from '../navigation/types';

// One soft circle with a line icon in the status colour. It was a saturated disc
// inside a pastel ring, heavy next to the flat cards around it.
const LOOK: Record<JoinStatus, { bg: string; fg: string; icon: IconName; title: string }> = {
  PENDING: { bg: '#FFF4E5', fg: '#B45309', icon: 'clock-outline', title: 'Waiting for HR' },
  APPROVED: { bg: '#DCFCE7', fg: '#15803D', icon: 'check-circle-outline', title: 'Approved' },
  REJECTED: { bg: '#FEE2E2', fg: '#B91C1C', icon: 'close-circle-outline', title: 'Not approved' },
  CANCELLED: { bg: '#EEF2F7', fg: '#64748B', icon: 'minus-circle-outline', title: 'Request cancelled' },
};

/**
 * The request this page is about: the exact one when a row was tapped, else the
 * one still waiting for this company, else this company's newest. Opened with no
 * params (the app restarted while waiting) that is the pending one, then the newest.
 */
function pickRequest(requests: JoinRequest[], requestId?: string, companyId?: string): JoinRequest | undefined {
  if (requestId) {
    const exact = requests.find((r) => String(r.id) === String(requestId));
    if (exact) return exact;
  }
  const sorted = newestFirst(requests);
  const forCompany = (r: JoinRequest) => !companyId || String(r.tenantId) === String(companyId);
  return sorted.find((r) => r.status === 'PENDING' && forCompany(r)) ?? sorted.find(forCompany);
}

export const JoinRequestPendingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'JoinRequestPending'>>();
  // The waiting-for-HR navigator opens this as its first page with no params.
  const params = route.params as Partial<RootStackParamList['JoinRequestPending']> | undefined;
  const requestId = params?.requestId;
  const companyId = params?.companyId || undefined;
  const { user, authStatus, refreshAuthState, refreshTenants, switchCompany, recheckPending } = usePayrollAuth();
  const dialog = useDialog();

  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Approved: busy moving into the company / done looking at whether that worked.
  const [entering, setEntering] = useState(false);
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const status: JoinStatus | null = request ? statusKey(request.status) : null;
  const tenantId = request?.tenantId || companyId || '';
  const companyName = request?.tenantName || params?.companyName || 'the company';
  const isMember = !!tenantId && (user?.availableTenants ?? []).some((t) => String(t.id).toLowerCase() === String(tenantId).toLowerCase());

  // Read through refs so the status check below does not depend on them: the
  // check must not re-run because the auth state it triggers has changed.
  const auth = useRef({ authStatus, refreshAuthState, refreshTenants });
  auth.current = { authStatus, refreshAuthState, refreshTenants };
  const approvalHandled = useRef(false);
  const autoEnter = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Into the company: its Home at the bottom of the stack, as on every app open
   * once a company is chosen, so Back from Home leaves the app. The company list
   * stays one tap away through the company pill.
   */
  const enterCompany = useCallback((): boolean => {
    const names = navigation.getState()?.routeNames ?? [];
    if (!names.includes('PayrollHome')) return false;
    navigation.reset({ index: 0, routes: [{ name: 'PayrollHome' }] });
    return true;
  }, [navigation]);

  /** Back where the person came from, or to the home of whichever group is showing. */
  const leave = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    // UserHome exists only before the person has a company, TenantHub only after.
    const names = navigation.getState()?.routeNames ?? [];
    if (names.includes('UserHome')) navigation.reset({ index: 0, routes: [{ name: 'UserHome' }] });
    else navigation.reset({ index: 0, routes: [{ name: 'TenantHub' }] });
  }, [navigation]);

  /** A new request replaces this page, so back from it does not return here. */
  const joinAnother = () => navigation.dispatch(StackActions.replace('JoinTenant'));

  const onApproved = useCallback(async (approved: JoinRequest) => {
    if (approvalHandled.current) return;
    approvalHandled.current = true;
    setEntering(true);
    try {
      if (auth.current.authStatus === 'authenticated') {
        // Already inside another company: the new one only has to show up in the
        // list, and the person chooses when to open it.
        await auth.current.refreshTenants();
      } else {
        // First company. Signed-in screens replace these as soon as the account
        // has it; the effect below then opens it.
        autoEnter.current = true;
        const ok = await auth.current.refreshAuthState(approved.tenantId);
        if (!ok) autoEnter.current = false;
      }
    } finally {
      if (mounted.current) {
        setEntering(false);
        setApprovalChecked(true);
      }
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const requests = await companyService.getJoinRequests();
      if (!mounted.current) return;
      const found = pickRequest(requests, requestId, companyId) ?? null;
      setRequest(found);
      setLoadState('ready');
      setLoadError(null);
      if (found && statusKey(found.status) === 'APPROVED') void onApproved(found);
    } catch (err) {
      if (!mounted.current) return;
      // A failed poll keeps what is already on screen; only a first load fails the page.
      setLoadState((prev) => (prev === 'ready' ? prev : 'failed'));
      setLoadError(serverMessage(err, 'Check your connection and try again.'));
    }
  }, [requestId, companyId, onApproved]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // Every 30 seconds while waiting; a decision stops it.
  useEffect(() => {
    if (status !== 'PENDING') return undefined;
    const interval = setInterval(() => { void checkStatus(); }, 30000);
    return () => clearInterval(interval);
  }, [status, checkStatus]);

  // The account now has its first company and the signed-in screens are in
  // place (this route is in both groups, so the page is still showing).
  useEffect(() => {
    if (!autoEnter.current || authStatus !== 'authenticated') return;
    autoEnter.current = false;
    enterCompany();
  }, [authStatus, enterCompany]);

  const retry = async () => {
    setRetrying(true);
    await checkStatus();
    setRetrying(false);
  };

  const openCompany = async () => {
    if (!tenantId) return;
    setActionError(null);
    setEntering(true);
    try {
      if (String(user?.tenantId ?? '').toLowerCase() !== tenantId.toLowerCase()) await switchCompany(tenantId);
      if (!enterCompany()) leave();
    } catch (err) {
      setActionError(serverMessage(err, 'Could not open this company. Please try again.'));
    } finally {
      if (mounted.current) setEntering(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!request) return;
    const ok = await dialog.confirm({
      title: 'Cancel request?',
      message: `Your request to join ${companyName} will be withdrawn. You can send a new one any time.`,
      confirmText: 'Yes, cancel',
      cancelText: 'Keep it',
      destructive: true,
      tone: 'warning',
    });
    if (!ok) return;

    setCancelling(true);
    setActionError(null);
    try {
      await companyService.cancelJoinRequest(String(request.id));
      // Shown here as cancelled, so the person sees it took, with the next step under it.
      if (mounted.current) setRequest({ ...request, status: 'CANCELLED' });
      // Out of the "waiting for HR" screens; this route exists in the next group
      // too, so the page stays where it is.
      void recheckPending();
    } catch (err) {
      setActionError(serverMessage(err, 'Could not cancel the request. Please try again.'));
    } finally {
      if (mounted.current) setCancelling(false);
    }
  };

  const renderBody = () => {
    if (loadState === 'loading') {
      return (
        <Card>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
            <Text style={styles.meta}>Checking your request…</Text>
          </View>
        </Card>
      );
    }
    if (loadState === 'failed') {
      return (
        <LoadFailed
          title="Could not load your request"
          message={loadError}
          onRetry={() => { void retry(); }}
          busy={retrying}
        />
      );
    }
    if (!request || !status) {
      return (
        <Card>
          <View style={styles.center}>
            <Text style={styles.title}>No request found</Text>
            <Text style={styles.body}>It may have been removed. You can send a new one.</Text>
          </View>
          <PrimaryButton icon="plus" label="Join a company" onPress={joinAnother} />
        </Card>
      );
    }

    const look = LOOK[status];
    const decidedAt = request.reviewedAt ? whenText(request.reviewedAt) : '';
    const meta =
      status === 'PENDING' || status === 'CANCELLED' || !decidedAt
        ? `Sent ${whenText(request.createdAt)}`
        : `${status === 'APPROVED' ? 'Approved' : 'Decided'} ${decidedAt}`;

    return (
      <Card>
        <View style={styles.head}>
          <View style={[styles.circle, { backgroundColor: look.bg }]}>
            <MaterialCommunityIcons name={look.icon} size={24} color={look.fg} />
          </View>
          <View style={styles.headText}>
            <Text style={styles.title}>{look.title}</Text>
            <Text style={styles.company} numberOfLines={2}>{companyName}</Text>
            <Text style={styles.meta}>{meta}</Text>
          </View>
        </View>

        {status === 'PENDING' ? (
          <>
            <ErrorLine message={actionError} />
            <View style={styles.gap} />
            <PrimaryButton
              icon="close-circle-outline"
              label="Cancel request"
              onPress={() => { void handleCancelRequest(); }}
              variant="danger"
              loading={cancelling}
              compact
            />
          </>
        ) : null}

        {status === 'APPROVED' ? (
          entering || !approvalChecked ? (
            <View style={styles.busyRow}>
              <ActivityIndicator size="small" color={C.blue} />
              <Text style={styles.meta}>Opening {companyName}…</Text>
            </View>
          ) : isMember ? (
            <>
              <ErrorLine message={actionError} />
              <View style={styles.gap} />
              {/* The company is the card's title already; in the button a long
                  name was cut off on one line. */}
              <PrimaryButton icon="arrow-right" label="Open company" onPress={() => { void openCompany(); }} />
            </>
          ) : (
            <>
              {/* Approved once, but the account is not in that company now (left,
                  or removed by HR since). Say so rather than promise to "take you in". */}
              <Text style={styles.note}>
                This company is not linked to your account any more. Ask HR for a new invitation if this is wrong.
              </Text>
              <View style={styles.gap} />
              <PrimaryButton icon="plus" label="Join a company" onPress={joinAnother} />
            </>
          )
        ) : null}

        {status === 'REJECTED' ? (
          <>
            {request.rejectionReason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason from HR</Text>
                <Text style={styles.reasonText}>{request.rejectionReason}</Text>
              </View>
            ) : null}
            <View style={styles.gap} />
            <PrimaryButton icon="plus" label="Join a company" onPress={joinAnother} />
          </>
        ) : null}

        {status === 'CANCELLED' ? (
          <>
            <View style={styles.gap} />
            <PrimaryButton icon="plus" label="Join a company" onPress={joinAnother} />
          </>
        ) : null}
      </Card>
    );
  };

  return (
    <AccountPage title="Join request" onBack={leave}>
      {renderBody()}
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headText: { flex: 1 },
  circle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: C.ink },
  company: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 2 },
  meta: { fontSize: 12, color: C.body, marginTop: 2 },
  body: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center' },
  note: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 12 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, minHeight: 44 },
  gap: { height: 14 },
  reasonBox: {
    backgroundColor: C.dangerBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 2 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.ink },
});

export default JoinRequestPendingScreen;
