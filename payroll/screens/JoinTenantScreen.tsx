/**
 * Join your company
 * One card: the invitation code first (it is the only thing required), then who
 * you are at the company, then one button. The code can be typed, pasted as a
 * link, or scanned — the scan icon inside the code field opens the camera, and a
 * good scan fills the field and submits.
 *
 * The page used to be called "Join Tenant", carried two explanatory paragraphs
 * and a "Need help?" card that repeated them, put the two optional fields first
 * without saying they were optional, and needed scrolling on a smaller Android
 * phone. Problems now show inline, under the field or above the button.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import companyService from '../api/services/companyService';
import { AUTH_COLORS as C, AuthField } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { AccountPage, Card, ErrorLine } from '../components/account/AccountUi';
import { serverMessage } from '../lib/serverMessage';

/**
 * What a scanned QR or a pasted link resolves to.
 *
 * A join code is now the primary form. It used to be the TENANT ID: a value that shows
 * up in URLs and JWT claims and can never be changed, so once it leaked anyone could
 * queue join requests at that company forever. Links carrying a tenantId still resolve,
 * because posters printed under the old scheme are out in the world. (Closing that door
 * has to happen on the server, which still accepts a bare tenant id from any client.)
 */
type JoinTarget =
  | { type: 'code'; code: string; companyName?: string }
  | { type: 'tenant'; tenantId: string; companyName?: string };

/**
 * Parse a scanned QR, a pasted link, or a typed code.
 * Accepts:
 *   - a bare code            ABCD234XYZ
 *   - payrollapp://join?code=ABCD234XYZ            (current invite QR)
 *   - https://…?code=ABCD234XYZ
 *   - JSON  {"code": "…"} or {"tenantId": "…"}     (older QR payloads)
 *   - payrollapp://join?tenantId=…                 (older invite links)
 */
function parseJoinInput(data: string): JoinTarget | null {
  const trimmed = (data ?? '').trim();
  if (!trimmed) return null;

  // JSON payload
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const companyName = parsed.companyName || parsed.tenantName || undefined;
      const code = parsed.code || parsed.inviteCode;
      if (code) return { type: 'code', code: String(code), companyName };
      if (parsed.tenantId) return { type: 'tenant', tenantId: String(parsed.tenantId), companyName };
    }
  } catch {
    // Not JSON — fall through.
  }

  // URL. Code wins over tenantId: a link carrying both is a new-style link with the id
  // left in for older builds, and the code is the part that can be revoked.
  if (/^(https?|payrollapp):\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const companyName = url.searchParams.get('companyName') || undefined;
      const code = url.searchParams.get('code') || url.searchParams.get('inviteCode');
      if (code) return { type: 'code', code, companyName };
      const tenantId = url.searchParams.get('tenantId');
      if (tenantId) return { type: 'tenant', tenantId, companyName };
    } catch {
      // Not a valid URL — fall through.
    }
    return null;
  }

  // Anything else typed by hand is a raw join code.
  return { type: 'code', code: trimmed };
}

/** The four bracket corners drawn around the scan area. */
const ScanCorners: React.FC<{ color: string }> = ({ color }) => (
  <>
    <View style={[styles.corner, styles.cornerTopLeft, { borderColor: color }]} />
    <View style={[styles.corner, styles.cornerTopRight, { borderColor: color }]} />
    <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: color }]} />
    <View style={[styles.corner, styles.cornerBottomRight, { borderColor: color }]} />
  </>
);

/**
 * The code from HR's invite QR when the phone camera opened it as a link
 * (payrollapp://join?code=…). Read loosely, so it works before and after the
 * route is given a typed `code` param, and parsed like a typed code so an old
 * tenant-id link cannot slip a raw id into the field.
 */
function codeFromParams(params: unknown): string {
  const raw = (params as { code?: unknown } | undefined)?.code;
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const target = parseJoinInput(raw);
  return target?.type === 'code' ? target.code : '';
}

export const JoinTenantScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const linkedCode = codeFromParams(route.params);
  const codeRef = useRef<TextInput>(null);
  const employeeCodeRef = useRef<TextInput>(null);
  const icRef = useRef<TextInput>(null);

  // Who this person is at the company. HR needs it whichever way the code
  // arrives — without it they receive a display name and an email and have to
  // guess which of a few hundred employee records that is.
  const [employeeCode, setEmployeeCode] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [codeInput, setCodeInput] = useState(linkedCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const submitTarget = useCallback(
    async (target: JoinTarget, how: 'code' | 'scan') => {
      const identity = { employeeCode, icNumber };
      const message = how === 'scan' ? 'Joined via QR scan' : 'Joined via invitation code';
      setSubmitError(null);
      setSubmitting(true);
      try {
        // A current invite carries a rotatable join code; older ones carry a tenant id.
        const joinRequest =
          target.type === 'code'
            ? await companyService.joinViaCode(target.code, { ...identity, message })
            : await companyService.submitJoinRequest(target.tenantId, message, identity);
        // Replace, not push: back from the request page should not land on this
        // form with the code still filled in.
        navigation.dispatch(
          StackActions.replace('JoinRequestPending', {
            requestId: joinRequest.id,
            companyId: joinRequest.tenantId || (target.type === 'tenant' ? target.tenantId : ''),
            companyName: joinRequest.tenantName || target.companyName || 'your company',
          }),
        );
      } catch (err) {
        setSubmitError(serverMessage(err, 'Could not send your request. Please try again.'));
      } finally {
        setSubmitting(false);
      }
    },
    [employeeCode, icNumber, navigation],
  );

  // Arrived with the code already filled in: start on the employee number. Not
  // sent by itself, because the number and IC are what HR matches the person on.
  useEffect(() => {
    if (!linkedCode) return undefined;
    const timer = setTimeout(() => employeeCodeRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [linkedCode]);

  /**
   * Back to where the person came from, or — when this page is the only one in
   * the stack (it replaced the waiting page) — to Home. The default goBack did
   * nothing there, so the arrow looked dead.
   */
  const leave = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const names = navigation.getState()?.routeNames ?? [];
    navigation.reset({ index: 0, routes: [{ name: names.includes('UserHome') ? 'UserHome' : 'TenantHub' }] });
  };

  const handleJoin = () => {
    if (submitting) return;
    const target = parseJoinInput(codeInput);
    if (!target) {
      setCodeError(
        codeInput.trim()
          ? 'That link has no invitation code in it. Ask HR for the current code.'
          : 'Enter the invitation code from HR.',
      );
      codeRef.current?.focus();
      return;
    }
    setCodeError(null);
    void submitTarget(target, 'code');
  };

  const openScanner = async () => {
    setScanned(false);
    setScanError(null);
    setScannerOpen(true);
    // Always ask when not granted. A one-time grant that has lapsed reports
    // canAskAgain=false yet the system dialog still appears; only when this
    // request comes back denied does the settings fallback make sense.
    if (permission && !permission.granted) {
      await requestPermission();
    }
  };

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned || submitting) return;
      setScanned(true);

      const target = parseJoinInput(data);
      if (!target) {
        // Said inside the scanner, with "Scan again" under it, rather than a
        // dialog stacked on top of the camera modal.
        setScanError('That QR is not an invitation from HR.');
        return;
      }
      // Show what was read, then send it — the person should not have to tap the
      // button for a code they just pointed the camera at.
      setCodeInput(target.type === 'code' ? target.code : data.trim());
      setCodeError(null);
      setScannerOpen(false);
      void submitTarget(target, 'scan');
    },
    [scanned, submitting, submitTarget],
  );

  return (
    <>
      <AccountPage title="Join your company" onBack={leave}>
        <Card>
          <AuthField
            ref={codeRef}
            label="Invitation code"
            icon="ticket-confirmation-outline"
            placeholder="Code or link from HR"
            value={codeInput}
            onChangeText={(v) => {
              setCodeInput(v);
              if (codeError) setCodeError(null);
            }}
            error={codeError}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!submitting}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => employeeCodeRef.current?.focus()}
            right={
              <View style={styles.codeActions}>
                {codeInput.length > 0 && !submitting ? (
                  <TouchableOpacity
                    onPress={() => setCodeInput('')}
                    style={styles.clearButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clear code"
                  >
                    <MaterialCommunityIcons name="close-circle" size={18} color={C.muted} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={() => { void openScanner(); }}
                  disabled={submitting}
                  style={styles.scanButton}
                  accessibilityRole="button"
                  accessibilityLabel="Scan QR code"
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color={C.blue} />
                </TouchableOpacity>
              </View>
            }
          />
          {codeError ? null : <Text style={styles.hint}>Ask HR for the code, or scan their QR.</Text>}

          <AuthField
            ref={employeeCodeRef}
            label="Employee number (optional)"
            icon="badge-account-horizontal-outline"
            placeholder="e.g. 210"
            value={employeeCode}
            onChangeText={setEmployeeCode}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!submitting}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => icRef.current?.focus()}
          />
          <AuthField
            ref={icRef}
            label="IC / passport no. (optional)"
            icon="card-account-details-outline"
            placeholder="As on the document"
            value={icNumber}
            onChangeText={setIcNumber}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!submitting}
            returnKeyType="go"
            onSubmitEditing={handleJoin}
          />

          <ErrorLine message={submitError} />
          <View style={styles.gap} />
          <PrimaryButton
            icon="send-outline"
            label="Send request"
            onPress={handleJoin}
            disabled={!codeInput.trim()}
            loading={submitting}
          />
        </Card>
      </AccountPage>

      {/* Scanner */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scanner}>
          <StatusBar barStyle="light-content" backgroundColor={C.ink} />
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned || !scannerOpen ? undefined : handleBarcodeScanned}
            />
          ) : null}

          <SafeAreaView style={styles.scannerOverlay} edges={['top', 'bottom']}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                onPress={() => setScannerOpen(false)}
                style={styles.scannerClose}
                accessibilityRole="button"
                accessibilityLabel="Close scanner"
              >
                <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan QR code</Text>
              <View style={styles.scannerClose} />
            </View>

            {permission?.granted ? (
              <>
                <View style={styles.scannerMiddle}>
                  <View style={styles.scannerTarget}>
                    <ScanCorners color={scanError ? '#FCA5A5' : '#FFFFFF'} />
                  </View>
                </View>
                <View style={styles.scannerFooter}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.scannerHint}>
                      {scanError ?? 'Point your camera at the QR code from HR'}
                    </Text>
                  )}
                  {scanned && !submitting ? (
                    <TouchableOpacity
                      onPress={() => {
                        setScanError(null);
                        setScanned(false);
                      }}
                      style={styles.rescan}
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
                      <Text style={styles.rescanText}>Scan again</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : (
              <View style={styles.scannerMiddle}>
                <View style={styles.permissionCard}>
                  <View style={styles.permissionIcon}>
                    <MaterialCommunityIcons name="camera-off-outline" size={28} color={C.blue} />
                  </View>
                  <Text style={styles.permissionTitle}>Camera access needed</Text>
                  {permission && !permission.canAskAgain ? (
                    <>
                      <Text style={styles.permissionBody}>Allow the camera for this app in Settings, then come back.</Text>
                      <PrimaryButton icon="cog-outline" label="Open Settings" onPress={() => { void Linking.openSettings(); }} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.permissionBody}>The camera is only used to read HR&apos;s QR code.</Text>
                      <PrimaryButton icon="camera" label="Allow camera" onPress={() => { void requestPermission(); }} />
                    </>
                  )}
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  codeActions: { flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: -6 },
  clearButton: { width: 36, height: 44, justifyContent: 'center', alignItems: 'center' },
  scanButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.blueSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: { fontSize: 12, lineHeight: 16, color: C.muted, marginTop: 4, marginLeft: 2 },
  gap: { height: 14 },

  // Scanner modal
  scanner: { flex: 1, backgroundColor: C.ink },
  scannerOverlay: { flex: 1 },
  scannerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  scannerClose: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scannerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  scannerMiddle: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scannerTarget: { width: 240, height: 240 },
  scannerFooter: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28, gap: 14 },
  scannerHint: { fontSize: 15, color: '#FFFFFF', textAlign: 'center', opacity: 0.9 },
  rescan: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  rescanText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  corner: { position: 'absolute', width: 40, height: 40 },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },

  permissionCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', gap: 10 },
  permissionIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center' },
  permissionTitle: { fontSize: 18, fontWeight: '800', color: C.ink, textAlign: 'center' },
  permissionBody: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center', marginBottom: 4 },
});

export default JoinTenantScreen;
