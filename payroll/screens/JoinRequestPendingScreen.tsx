/**
 * Join Request status
 * Shown after a join request is submitted, and again whenever the app opens
 * while one is still waiting. Polls the server and moves the person on when
 * HR decides: approved sends them into the company, rejected shows HR's reason
 * and offers another try.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import companyService, { JoinRequest } from '../api/services/companyService';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { AccountPage, Card } from '../components/account/AccountUi';

type JoinRequestPendingParams = {
  JoinRequestPending: {
    requestId?: string;
    companyId: string;
    companyName: string;
  };
};

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const LOOK: Record<RequestStatus, { ring: string; fill: string; icon: 'clock-outline' | 'check' | 'close'; pill: string; pillText: string }> = {
  PENDING: { ring: '#FFF4E5', fill: '#F59E0B', icon: 'clock-outline', pill: '#FFF4E5', pillText: '#B45309' },
  APPROVED: { ring: '#E7F7EE', fill: '#22C55E', icon: 'check', pill: '#DCFCE7', pillText: '#15803D' },
  REJECTED: { ring: '#FDECEC', fill: '#EF4444', icon: 'close', pill: '#FEE2E2', pillText: '#B91C1C' },
};

export const JoinRequestPendingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<JoinRequestPendingParams, 'JoinRequestPending'>>();
  const { requestId, companyId, companyName: paramCompanyName } = route.params || { companyId: '', companyName: '' };
  const { refreshAuthState } = usePayrollAuth();
  const dialog = useDialog();

  const [status, setStatus] = useState<RequestStatus>('PENDING');
  const [companyName, setCompanyName] = useState(paramCompanyName || 'the company');
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();
  const [cancelling, setCancelling] = useState(false);

  // Pulse while waiting — the one state where nothing visibly happens.
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status !== 'PENDING') return undefined;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, status]);

  const checkStatus = useCallback(async () => {
    try {
      const requests = await companyService.getJoinRequests();
      // The request for this company; when the screen was opened without params
      // (app relaunched while waiting), the most recent request is the one.
      const req =
        (companyId ? requests.find((r) => String(r.tenantId) === String(companyId)) : undefined) ?? requests[0];
      if (!req) return;
      if (req.tenantName) setCompanyName(req.tenantName);
      setStatus(req.status as RequestStatus);
      if (req.rejectionReason) setRejectionReason(req.rejectionReason);
      if (req.status === 'APPROVED') {
        // The auth context notices the new company and swaps the navigator to
        // the full app on its own; nothing to navigate to from here.
        await refreshAuthState();
      }
    } catch {
      // Silently fail on poll — the next interval retries.
    }
  }, [companyId, refreshAuthState]);

  // Check straight away (a decision may already be in), then every 30 seconds while waiting.
  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (status !== 'PENDING') return undefined;
    const interval = setInterval(() => { void checkStatus(); }, 30000);
    return () => clearInterval(interval);
  }, [status, checkStatus]);

  const goToHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'UserHome' as never }] });
  };

  const handleCancelRequest = async () => {
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
    try {
      let idToCancel: string | null = requestId ?? null;
      if (!idToCancel) {
        const requests = await companyService.getJoinRequests();
        const req: JoinRequest | undefined =
          (companyId ? requests.find((r) => String(r.tenantId) === String(companyId)) : undefined) ??
          (companyName ? requests.find((r) => r.tenantName === companyName) : undefined) ??
          requests.find((r) => r.status === 'PENDING') ??
          requests[0];
        idToCancel = req ? String(req.id) : null;
      }
      if (idToCancel) {
        await companyService.cancelJoinRequest(idToCancel);
        goToHome();
      } else {
        await dialog.notify({ title: 'Nothing to cancel', message: 'No pending request was found.', tone: 'warning' });
      }
    } catch (err: any) {
      await dialog.notify({
        title: 'Could not cancel',
        message: err?.response?.data?.message ?? err?.message ?? 'Failed to cancel request.',
        tone: 'danger',
      });
    } finally {
      setCancelling(false);
    }
  };

  const look = LOOK[status];

  return (
    <AccountPage title="Join Request" subtitle="Review your request" onBack={goToHome}>
      <Card>
        <View style={styles.center}>
          {/* Status mark: soft ring around a solid disc */}
          <Animated.View style={[styles.ring, { backgroundColor: look.ring, transform: [{ scale: status === 'PENDING' ? pulseAnim : 1 }] }]}>
            <View style={[styles.disc, { backgroundColor: look.fill }]}>
              <MaterialCommunityIcons name={look.icon} size={40} color="#FFFFFF" />
            </View>
          </Animated.View>

          {status === 'APPROVED' && (
            <>
              <Text style={styles.title}>Request Approved!</Text>
              <Text style={styles.body}>
                Your request to join{'\n'}
                <Text style={styles.company}>{companyName}</Text>
                {'\n'}was approved. Taking you in…
              </Text>
            </>
          )}

          {status === 'REJECTED' && (
            <>
              <Text style={styles.title}>Request Rejected</Text>
              <Text style={styles.body}>
                Your request to join{'\n'}
                <Text style={styles.company}>{companyName}</Text>
                {'\n'}was rejected.
              </Text>
              {rejectionReason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Reason</Text>
                  <Text style={styles.reasonText}>{rejectionReason}</Text>
                </View>
              ) : null}
              <PrimaryButton icon="refresh" label="Try Another Company" onPress={goToHome} />
            </>
          )}

          {status === 'PENDING' && (
            <>
              <Text style={styles.title}>Request Pending</Text>
              <Text style={styles.body}>
                Your request to join{'\n'}
                <Text style={styles.company}>{companyName}</Text>
                {'\n'}has been submitted. HR will review it.
              </Text>
              <View style={[styles.pill, { backgroundColor: look.pill }]}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={look.pillText} />
                <Text style={[styles.pillText, { color: look.pillText }]}>Waiting for HR</Text>
              </View>
              <PrimaryButton icon="close-circle-outline" label="Cancel Request" onPress={() => { void handleCancelRequest(); }} variant="danger" loading={cancelling} />
              <Text style={styles.hint}>Status checks automatically every 30 seconds.</Text>
            </>
          )}
        </View>
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 8 },
  ring: { width: 128, height: 128, borderRadius: 64, justifyContent: 'center', alignItems: 'center', marginBottom: 22 },
  disc: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 23, color: C.body, textAlign: 'center', marginBottom: 20 },
  company: { fontWeight: '800', color: C.ink },
  reasonBox: {
    width: '100%',
    backgroundColor: C.dangerBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  reasonLabel: { fontSize: 12, fontWeight: '700', color: C.danger, marginBottom: 4 },
  reasonText: { fontSize: 14, lineHeight: 20, color: C.body },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginBottom: 20 },
  pillText: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, color: C.muted, marginTop: 14, textAlign: 'center' },
});

export default JoinRequestPendingScreen;
