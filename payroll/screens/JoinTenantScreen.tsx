/**
 * Join Tenant Screen
 * One page: who you are at the company, then the invitation code. The code can
 * be typed, pasted as a link, or scanned — the scan icon inside the code field
 * opens the camera, and a good scan fills the field and submits. Two ways to
 * get the same string did not deserve two tabs.
 */

import React, { useState, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import companyService from '../api/services/companyService';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { AccountPage, Card, SectionHeader } from '../components/account/AccountUi';
import { useDialog } from '../components/ui/AppDialog';

/**
 * What a scanned QR or a pasted link resolves to.
 *
 * A join code is now the primary form. It used to be the TENANT ID: a value that shows
 * up in URLs and JWT claims and can never be changed, so once it leaked anyone could
 * queue join requests at that company forever. Links carrying a tenantId still resolve,
 * because posters printed under the old scheme are out in the world.
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

/** The server's own words when it has any; otherwise ours. */
function failureMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown } }; message?: unknown } | null;
  const server = e?.response?.data?.message;
  if (typeof server === 'string' && server) return server;
  if (e?.message === 'Network Error') return 'Could not reach the server. Check your connection and try again.';
  if (typeof e?.message === 'string' && e.message) return e.message;
  return fallback;
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

export const JoinTenantScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  // Who this person is at the company. HR needs it whichever way the code
  // arrives — without it they receive a display name and an email and have to
  // guess which of a few hundred employee records that is.
  const [employeeCode, setEmployeeCode] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [focused, setFocused] = useState<'code' | 'ic' | 'invite' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const submitTarget = useCallback(
    async (target: JoinTarget, how: 'code' | 'scan') => {
      const identity = { employeeCode, icNumber };
      const message = how === 'scan' ? 'Joined via QR scan' : 'Joined via invitation code';
      setSubmitting(true);
      try {
        // A current invite carries a rotatable join code; older ones carry a tenant id.
        const joinRequest =
          target.type === 'code'
            ? await companyService.joinViaCode(target.code, { ...identity, message })
            : await companyService.submitJoinRequest(target.tenantId, message, identity);
        navigation.navigate('JoinRequestPending', {
          companyId: target.type === 'code' ? joinRequest.tenantId : target.tenantId,
          companyName: joinRequest.tenantName || target.companyName || 'Company',
        } as never);
      } catch (err) {
        await dialog.notify({ title: 'Join failed', message: failureMessage(err, 'Failed to submit join request. Please try again.'), tone: 'danger' });
      } finally {
        setSubmitting(false);
      }
    },
    [employeeCode, icNumber, navigation, dialog],
  );

  const handleJoin = () => {
    const target = parseJoinInput(codeInput);
    if (!target) {
      void dialog.notify({ title: 'Enter a code', message: 'Please enter an invitation code or link.', tone: 'warning' });
      return;
    }
    void submitTarget(target, 'code');
  };

  const openScanner = async () => {
    setScanned(false);
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

      console.log('[JoinTenant] QR raw data:', data);
      const target = parseJoinInput(data);
      if (!target) {
        void dialog
          .notify({
            title: 'Invalid QR code',
            message: 'This QR code does not contain valid join information. Please try a different code.',
            buttonText: 'Scan again',
            tone: 'warning',
          })
          .then(() => setScanned(false));
        return;
      }
      // Show what was read, then send it — the person should not have to tap Join
      // for a code they just pointed the camera at.
      setCodeInput(target.type === 'code' ? target.code : data.trim());
      setScannerOpen(false);
      void submitTarget(target, 'scan');
    },
    [scanned, submitting, submitTarget, dialog],
  );

  return (
    <>
      <AccountPage title="Join Tenant" subtitle="Connect to your company">
        <SectionHeader title="Who are you at this company?" description="HR uses this to match you to your employee record. Without it, your request may wait while they work out who you are." />
        <Card>
          <View style={[styles.field, focused === 'code' && styles.fieldFocused]}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={C.muted} />
            <TextInput
              style={styles.input}
              placeholder="Employee number (e.g. 210)"
              placeholderTextColor={C.muted}
              value={employeeCode}
              onChangeText={setEmployeeCode}
              onFocus={() => setFocused('code')}
              onBlur={() => setFocused(null)}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
          <View style={[styles.field, styles.fieldLast, focused === 'ic' && styles.fieldFocused]}>
            <MaterialCommunityIcons name="card-account-details-outline" size={22} color={C.muted} />
            <TextInput
              style={styles.input}
              placeholder="IC or passport number"
              placeholderTextColor={C.muted}
              value={icNumber}
              onChangeText={setIcNumber}
              onFocus={() => setFocused('ic')}
              onBlur={() => setFocused(null)}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
        </Card>

        <SectionHeader title="Invitation code" description="Paste the code or link from your HR, or tap the scan icon to read their QR." />
        <Card>
          <View style={[styles.field, styles.fieldLast, focused === 'invite' && styles.fieldFocused]}>
            <MaterialCommunityIcons name="link-variant" size={22} color={C.muted} />
            <TextInput
              style={styles.input}
              placeholder="Enter invitation code or link"
              placeholderTextColor={C.muted}
              value={codeInput}
              onChangeText={setCodeInput}
              onFocus={() => setFocused('invite')}
              onBlur={() => setFocused(null)}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              returnKeyType="go"
              onSubmitEditing={handleJoin}
            />
            {codeInput.length > 0 && !submitting ? (
              <TouchableOpacity onPress={() => setCodeInput('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear">
                <MaterialCommunityIcons name="close-circle" size={20} color={C.muted} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={openScanner}
              disabled={submitting}
              style={styles.scanButton}
              accessibilityRole="button"
              accessibilityLabel="Scan QR code"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={22} color={C.blue} />
            </TouchableOpacity>
          </View>
          <View style={styles.gap} />
          <PrimaryButton icon="login" label="Join" onPress={handleJoin} disabled={!codeInput.trim()} loading={submitting} />
        </Card>

        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <MaterialCommunityIcons name="information-outline" size={24} color={C.blue} />
          </View>
          <View style={styles.helpText}>
            <Text style={styles.helpTitle}>Need help?</Text>
            <Text style={styles.helpBody}>Your HR admin can give you an invitation code, a link, or a QR code to scan.</Text>
          </View>
        </View>
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                    <ScanCorners color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.scannerFooter}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.scannerHint}>Point your camera at the company QR code</Text>
                  )}
                  {scanned && !submitting ? (
                    <TouchableOpacity onPress={() => setScanned(false)} style={styles.rescan}>
                      <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
                      <Text style={styles.rescanText}>Scan Again</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : (
              <View style={styles.scannerMiddle}>
                <View style={styles.permissionCard}>
                  <View style={styles.permissionIcon}>
                    <MaterialCommunityIcons name="camera-off-outline" size={34} color={C.blue} />
                  </View>
                  <Text style={styles.permissionTitle}>Camera Access Required</Text>
                  <Text style={styles.permissionBody}>To scan QR codes, please grant camera permission.</Text>
                  {permission && !permission.canAskAgain ? (
                    <>
                      <Text style={styles.permissionBody}>Camera was refused earlier, so the phone will not ask again. Allow it for this app in Settings, then come back.</Text>
                      <PrimaryButton icon="cog-outline" label="Open App Settings" onPress={() => { void Linking.openSettings(); }} />
                    </>
                  ) : (
                    <PrimaryButton icon="camera" label="Grant Camera Permission" onPress={() => { void requestPermission(); }} />
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingLeft: 14,
    paddingRight: 8,
    marginBottom: 10,
  },
  fieldLast: { marginBottom: 0 },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 0 },
  scanButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gap: { height: 14 },

  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
  },
  helpIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  helpText: { flex: 1 },
  helpTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  helpBody: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 2 },

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
  rescan: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  rescanText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  corner: { position: 'absolute', width: 40, height: 40 },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },

  permissionCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', gap: 10 },
  permissionIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  permissionTitle: { fontSize: 20, fontWeight: '800', color: C.ink, textAlign: 'center' },
  permissionBody: { fontSize: 14, lineHeight: 21, color: C.body, textAlign: 'center', marginBottom: 6 },
});

export default JoinTenantScreen;
