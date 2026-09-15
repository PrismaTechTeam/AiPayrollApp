/**
 * Two-Factor Authentication.
 * Same authenticator-app scheme as the web: the server issues a secret, the
 * person adds it to Google/Microsoft Authenticator, and a 6-digit code proves
 * the pairing before anything is enforced.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { describeAuthError } from '../lib/firebaseErrors';
import accountService, { TwoFactorSetup } from '../api/services/accountService';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { AccountPage, Card, CardHeader, ErrorLine, Field, Pill } from '../components/account/AccountUi';

export const AccountTwoFactorScreen: React.FC = () => {
  const { user } = usePayrollAuth();
  const userId = user?.uid ?? '';
  const dialog = useDialog();

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setEnabled(await accountService.isTwoFactorEnabled(userId));
    } catch {
      // Unknown status reads as "off"; the person can still try to set it up.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const beginSetup = async () => {
    setError(null);
    setBusy(true);
    try {
      setSetup(await accountService.beginTwoFactorSetup(userId));
      setCode('');
    } catch (err) {
      setError(describeAuthError(err, 'Could not start two-factor setup. Please try again.'));
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
      setEnabled(true);
      setSetup(null);
      setCode('');
      await dialog.notify({ title: 'Two-factor enabled', message: 'A code from your authenticator app is now required when signing in on the web.', tone: 'success' });
    } catch (err) {
      setError(describeAuthError(err, 'The code was not accepted. Check the app and try again.'));
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
      setEnabled(false);
      setDisabling(false);
      setCode('');
      await dialog.notify({ title: 'Two-factor turned off', message: 'Sign-in no longer asks for a code.', tone: 'success' });
    } catch (err) {
      setError(describeAuthError(err, 'The code was not accepted. Check the app and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!setup) return;
    await Clipboard.setStringAsync(setup.key);
    await dialog.notify({ title: 'Copied', message: 'The setup key is on your clipboard.' });
  };

  const openAuthenticator = async () => {
    if (!setup) return;
    try {
      await Linking.openURL(setup.totpUrl);
    } catch {
      await dialog.notify({
        title: 'No authenticator app found',
        message: 'Install Google Authenticator or Microsoft Authenticator, then come back and scan the code or enter the key.',
        tone: 'warning',
      });
    }
  };

  const formattedKey = setup ? setup.key.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim() : '';

  return (
    <AccountPage title="Two-Factor" subtitle="Authenticator app">
      <Card>
        <CardHeader
          icon="shield-check-outline"
          title="Two-Factor Authentication"
          hint="A code from an authenticator app is asked for at web sign-in."
          right={loading ? <ActivityIndicator size="small" color={C.blue} /> : <Pill on={enabled} onLabel="Enabled" />}
        />

        {!loading && !enabled && !setup && (
          <>
            <Text style={styles.body}>
              Protects your account even if someone learns your password. You will need an authenticator app such as Google Authenticator or Microsoft Authenticator.
            </Text>
            <PrimaryButton icon="shield-plus-outline" label="Set Up Two-Factor" onPress={beginSetup} loading={busy} />
          </>
        )}

        {!loading && !enabled && setup && (
          <View>
            <Text style={styles.step}>1. Scan this code with your authenticator app.</Text>
            <View style={styles.qrBox}>
              <QRCode value={setup.totpUrl} size={168} backgroundColor="#FFFFFF" color={C.ink} />
            </View>
            <TouchableOpacity onPress={openAuthenticator} style={styles.inlineLink} hitSlop={{ top: 6, bottom: 6 }}>
              <MaterialCommunityIcons name="open-in-new" size={16} color={C.blue} />
              <Text style={styles.inlineLinkText}>Open in authenticator app on this phone</Text>
            </TouchableOpacity>
            <Text style={styles.step}>Or enter this key by hand:</Text>
            <View style={styles.keyRow}>
              <Text style={styles.keyText} selectable>{formattedKey}</Text>
              <TouchableOpacity onPress={copyKey} style={styles.copyButton} accessibilityRole="button" accessibilityLabel="Copy key">
                <MaterialCommunityIcons name="content-copy" size={18} color={C.blue} />
              </TouchableOpacity>
            </View>
            <Text style={styles.step}>2. Enter the 6-digit code the app shows.</Text>
            <Field label="Verification Code" icon="numeric" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} placeholder="123456" keyboardType="number-pad" maxLength={6} />
            <ErrorLine message={error} />
            <View style={styles.gap} />
            <PrimaryButton icon="check-decagram-outline" label="Verify & Enable" onPress={confirmSetup} disabled={code.length !== 6} loading={busy} />
            <View style={styles.gap} />
            <PrimaryButton label="Cancel" onPress={() => { setSetup(null); setCode(''); setError(null); }} variant="outline" disabled={busy} />
          </View>
        )}

        {!loading && enabled && !disabling && (
          <>
            <Text style={styles.body}>Your account asks for a code from your authenticator app when signing in on the web.</Text>
            <PrimaryButton icon="shield-off-outline" label="Turn Off Two-Factor" onPress={() => { setDisabling(true); setCode(''); setError(null); }} variant="outline" />
          </>
        )}

        {!loading && enabled && disabling && (
          <View>
            <Text style={styles.step}>Enter the current code from your authenticator app to turn two-factor off.</Text>
            <Field label="Verification Code" icon="numeric" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} placeholder="123456" keyboardType="number-pad" maxLength={6} autoFocus />
            <ErrorLine message={error} />
            <View style={styles.gap} />
            <PrimaryButton icon="shield-off-outline" label="Turn Off" onPress={disable} disabled={code.length !== 6} loading={busy} variant="danger" />
            <View style={styles.gap} />
            <PrimaryButton label="Keep It On" onPress={() => { setDisabling(false); setCode(''); setError(null); }} variant="outline" disabled={busy} />
          </View>
        )}

        {!loading && !setup && !disabling ? <ErrorLine message={error} /> : null}
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21, color: C.body, marginBottom: 14 },
  step: { fontSize: 13, lineHeight: 19, color: C.body, marginTop: 10 },
  qrBox: { alignSelf: 'center', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFFFF', marginTop: 12 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  inlineLinkText: { fontSize: 13, fontWeight: '700', color: C.blue },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 8,
  },
  keyText: { flex: 1, fontSize: 15, fontWeight: '700', letterSpacing: 1, color: C.ink, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  gap: { height: 10 },
});

export default AccountTwoFactorScreen;
