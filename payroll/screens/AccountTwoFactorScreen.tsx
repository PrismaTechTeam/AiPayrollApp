/**
 * Two-Factor Authentication.
 * Same authenticator-app scheme as the web: the server issues a secret, the
 * person adds it to Google/Microsoft Authenticator, and a 6-digit code proves
 * the pairing before anything is enforced.
 *
 * The server asks for the code at web sign-in only (mobile sign-in does not
 * check it yet), so that is all this page claims.
 *
 * Setup leads with "Add to authenticator app": people set this up on the same
 * phone that holds the authenticator, and a phone cannot scan its own screen.
 * The QR is one tap away for adding it on another phone. The whole step fits
 * one screen, code field and button included.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import accountService, { accountErrorMessage, TwoFactorSetup } from '../api/services/accountService';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { AccountPage, Card, CardHeader, ErrorLine, Field, Pill } from '../components/account/AccountUi';

/** Status of the account's two-factor: still asking, known, or the lookup failed. */
type Status = 'loading' | 'on' | 'off' | 'failed';

export const AccountTwoFactorScreen: React.FC = () => {
  const { user } = usePayrollAuth();
  const userId = user?.uid ?? '';
  const dialog = useDialog();

  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus('loading');
    setLoadError(null);
    try {
      setStatus((await accountService.isTwoFactorEnabled(userId)) ? 'on' : 'off');
    } catch (err) {
      // Not "off": offering set-up to someone who already has it on, on the
      // strength of a failed request, would be stating a guess as fact.
      setLoadError(accountErrorMessage(err, 'Could not check your two-factor status.'));
      setStatus('failed');
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const resetForm = () => {
    setCode('');
    setError(null);
  };

  const beginSetup = async () => {
    setError(null);
    setBusy(true);
    try {
      setSetup(await accountService.beginTwoFactorSetup(userId));
      setShowQr(false);
      setCode('');
    } catch (err) {
      setError(accountErrorMessage(err, 'Could not start two-factor setup. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async () => {
    if (code.length !== 6) return setError('Enter the 6-digit code from your authenticator app.');
    setError(null);
    setBusy(true);
    try {
      await accountService.confirmTwoFactor(userId, code);
      setStatus('on');
      setSetup(null);
      setCode('');
      await dialog.notify({ title: 'Two-factor is on', message: 'A code from your authenticator app is now asked for when you sign in on the web.', tone: 'success' });
    } catch (err) {
      setError(accountErrorMessage(err, 'The code was not accepted. Check the app and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (code.length !== 6) return setError('Enter the 6-digit code from your authenticator app to turn it off.');
    setError(null);
    setBusy(true);
    try {
      await accountService.disableTwoFactor(userId, code);
      setStatus('off');
      setDisabling(false);
      setCode('');
      await dialog.notify({ title: 'Two-factor is off', message: 'Web sign-in no longer asks for a code.', tone: 'success' });
    } catch (err) {
      setError(accountErrorMessage(err, 'The code was not accepted. Check the app and try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Said on the button itself, not in a dialog that has to be dismissed.
  const copyKey = async () => {
    if (!setup) return;
    await Clipboard.setStringAsync(setup.key.replace(/\s+/g, ''));
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const openAuthenticator = async () => {
    if (!setup) return;
    try {
      await Linking.openURL(setup.totpUrl);
    } catch {
      await dialog.notify({
        title: 'No authenticator app found',
        message: 'Install Google Authenticator or Microsoft Authenticator, then come back and tap Add again, or copy the key into it.',
        tone: 'warning',
      });
    }
  };

  const formattedKey = setup ? setup.key.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim() : '';

  const codeField = (autoFocus: boolean) => (
    <Field
      label="6-digit code from the app"
      icon="numeric"
      value={code}
      onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
      placeholder="123456"
      keyboardType="number-pad"
      maxLength={6}
      autoFocus={autoFocus}
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
    />
  );

  const pill =
    status === 'loading' ? <ActivityIndicator size="small" color={C.blue} />
      : status === 'on' ? <Pill on onLabel="On" />
        : status === 'off' ? <Pill on={false} />
          : null;

  return (
    <AccountPage title="Two-Factor">
      <Card>
        <CardHeader
          icon="shield-check-outline"
          title="Authenticator App"
          hint="Asks for a code when you sign in on the web."
          right={pill}
        />

        {status === 'failed' && (
          <>
            <ErrorLine message={loadError} />
            <View style={styles.gap} />
            <PrimaryButton icon="refresh" label="Try again" onPress={() => { void load(); }} variant="outline" compact />
          </>
        )}

        {status === 'off' && !setup && (
          <>
            <View style={styles.gap} />
            <PrimaryButton icon="shield-plus-outline" label="Set Up Two-Factor" onPress={() => { void beginSetup(); }} loading={busy} compact />
          </>
        )}

        {status === 'off' && setup && (
          <View>
            <Text style={styles.step}>1. Add this account to your authenticator app</Text>
            <PrimaryButton icon="open-in-new" label="Add to Authenticator App" onPress={() => { void openAuthenticator(); }} variant="outline" compact />

            <Text style={styles.subStep}>Or type this key into the app</Text>
            <View style={styles.keyRow}>
              <Text style={styles.keyText} selectable numberOfLines={2}>{formattedKey}</Text>
              <TouchableOpacity
                onPress={() => { void copyKey(); }}
                style={styles.copyButton}
                accessibilityRole="button"
                accessibilityLabel={copied ? 'Key copied' : 'Copy key'}
              >
                <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={18} color={C.blue} />
                <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowQr((v) => !v)}
              style={styles.textLink}
              accessibilityRole="button"
              accessibilityState={{ expanded: showQr }}
            >
              <MaterialCommunityIcons name="qrcode" size={16} color={C.blue} />
              <Text style={styles.textLinkText}>{showQr ? 'Hide QR code' : 'Show QR code for another phone'}</Text>
            </TouchableOpacity>
            {showQr ? (
              <View style={styles.qrBox}>
                <QRCode value={setup.totpUrl} size={150} backgroundColor="#FFFFFF" color={C.ink} />
              </View>
            ) : null}

            <Text style={styles.step}>2. Enter the code the app shows</Text>
            {codeField(false)}
            <ErrorLine message={error} />
            <View style={styles.gap} />
            <PrimaryButton icon="check-decagram-outline" label="Verify & Turn On" onPress={() => { void confirmSetup(); }} disabled={code.length !== 6} loading={busy} compact />
            <TouchableOpacity
              onPress={() => { setSetup(null); resetForm(); }}
              disabled={busy}
              style={styles.cancelLink}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'on' && !disabling && (
          <>
            <View style={styles.gap} />
            <PrimaryButton icon="shield-off-outline" label="Turn Off Two-Factor" onPress={() => { setDisabling(true); resetForm(); }} variant="outline" compact />
          </>
        )}

        {status === 'on' && disabling && (
          <View>
            <Text style={styles.step}>Enter the current code from your authenticator app to turn it off.</Text>
            {codeField(true)}
            <ErrorLine message={error} />
            <View style={styles.gap} />
            <PrimaryButton icon="shield-off-outline" label="Turn Off" onPress={() => { void disable(); }} disabled={code.length !== 6} loading={busy} variant="danger" compact />
            <TouchableOpacity
              onPress={() => { setDisabling(false); resetForm(); }}
              disabled={busy}
              style={styles.cancelLink}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Keep It On</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Set-up failures (before a secret exists) land here; the steps above show their own. */}
        {status === 'off' && !setup ? <ErrorLine message={error} /> : null}
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  step: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 14, marginBottom: 8 },
  subStep: { fontSize: 12, fontWeight: '700', color: C.body, marginTop: 12, marginLeft: 2, letterSpacing: 0.3 },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 2,
    marginTop: 5,
  },
  keyText: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 1, color: C.ink, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyButton: { minWidth: 76, height: 44, flexDirection: 'row', gap: 4, borderRadius: 10, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  copyText: { fontSize: 13, fontWeight: '700', color: C.blue },
  textLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 44 },
  textLinkText: { fontSize: 13, fontWeight: '700', color: C.blue },
  qrBox: { alignSelf: 'center', padding: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFFFF', marginBottom: 4 },
  cancelLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.body },
  gap: { height: 10 },
});

export default AccountTwoFactorScreen;
