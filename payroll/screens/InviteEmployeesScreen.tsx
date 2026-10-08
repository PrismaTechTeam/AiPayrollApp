/**
 * Invite Employees — the company's invitation code, for HR to hand over in person.
 *
 * A new employee scans the QR with their phone camera (payrollapp://join?code=…
 * opens the join form with the code filled in) or types the code into Join a
 * company. Help already told people to "scan their QR code", but HR had no way
 * to show one from the phone.
 *
 * Reading only: issuing a code, rotating a leaked one and setting its expiry
 * stay on the web, where the posters that carry it are printed. Loading, failed,
 * no code yet, expired and ready are five different answers, shown five ways.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Share, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import companyService, { type CompanyJoinCode } from '../api/services/companyService';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { AccountPage, Card, LoadFailed } from '../components/account/AccountUi';
import { shortDate } from '../components/requests/RequestUi';
import { serverMessage } from '../lib/serverMessage';

type Load =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; joinCode: CompanyJoinCode };

/** What the QR carries: the app's own link, which JoinTenant reads the code from. */
const joinLink = (code: string) => `payrollapp://join?code=${encodeURIComponent(code)}`;

export const InviteEmployeesScreen: React.FC = () => {
  const { user } = usePayrollAuth();
  const dialog = useDialog();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const read = useCallback(async () => {
    setLoad({ kind: 'loading' });
    try {
      const joinCode = await companyService.getJoinCode();
      if (alive.current) setLoad({ kind: 'ready', joinCode });
    } catch (err) {
      if (alive.current) setLoad({ kind: 'failed', message: serverMessage(err, 'Check your connection and try again.') });
    }
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

  const company = user?.tenantName || 'our company';

  const copy = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      dialog.toast('Code copied', 'success');
    } catch {
      dialog.toast('Could not copy the code', 'danger');
    }
  };

  const share = async (code: string) => {
    try {
      await Share.share({
        message: `Join ${company} on the Payroll app with invitation code ${code}, or open ${joinLink(code)}`,
      });
    } catch {
      // The person closed the share sheet, or no app could take it: nothing to say.
    }
  };

  let body: React.ReactNode;
  if (load.kind === 'loading') {
    body = (
      <Card>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      </Card>
    );
  } else if (load.kind === 'failed') {
    body = <LoadFailed title="Could not load the invitation code" message={load.message} onRetry={() => { void read(); }} />;
  } else if (!load.joinCode.code) {
    body = (
      <Card>
        <View style={styles.state}>
          <View style={styles.stateIcon}>
            <MaterialCommunityIcons name="qrcode-remove" size={28} color={C.body} />
          </View>
          <Text style={styles.stateTitle}>No code yet</Text>
          <Text style={styles.stateBody}>Create one on the web: Employee Portal.</Text>
        </View>
      </Card>
    );
  } else {
    const { code, expiresAt, isExpired } = load.joinCode;
    body = (
      <Card>
        <View style={styles.codeBlock}>
          {isExpired ? (
            // An expired code is refused at join, so no QR to scan and nothing to share.
            <View style={[styles.qrFrame, styles.qrExpired]}>
              <MaterialCommunityIcons name="qrcode-remove" size={56} color={C.muted} />
            </View>
          ) : (
            <View style={styles.qrFrame} accessible accessibilityLabel={`QR code for invitation code ${code}`}>
              <QRCode value={joinLink(code)} size={180} backgroundColor="#FFFFFF" color={C.ink} />
            </View>
          )}

          <Text style={[styles.code, isExpired && styles.codeExpired]} selectable accessibilityLabel={`Code ${code.split('').join(' ')}`}>
            {code}
          </Text>
          {isExpired ? (
            <Text style={styles.expired}>Expired · issue a new one on the web</Text>
          ) : expiresAt ? (
            <Text style={styles.expiry}>Expires {shortDate(expiresAt)}</Text>
          ) : (
            <Text style={styles.expiry}>Does not expire</Text>
          )}
        </View>

        {isExpired ? null : (
          <View style={styles.actions}>
            <View style={styles.half}>
              <PrimaryButton icon="content-copy" label="Copy" onPress={() => { void copy(code); }} variant="outline" compact />
            </View>
            <View style={styles.half}>
              <PrimaryButton icon="share-variant-outline" label="Share" onPress={() => { void share(code); }} compact />
            </View>
          </View>
        )}
      </Card>
    );
  }

  return (
    <AccountPage title="Invite Employees" subtitle={user?.tenantName ?? undefined}>
      {body}
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  centre: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },

  state: { alignItems: 'center', paddingVertical: 20 },
  stateIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5FB', alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12 },
  stateBody: { fontSize: 13, color: C.body, marginTop: 4, textAlign: 'center' },

  codeBlock: { alignItems: 'center', paddingTop: 4 },
  qrFrame: {
    width: 204,
    height: 204,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrExpired: { backgroundColor: C.field },
  code: {
    fontSize: 22,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: 2,
    marginTop: 16,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  codeExpired: { color: C.muted, textDecorationLine: 'line-through' },
  expiry: { fontSize: 13, color: C.body, marginTop: 4 },
  expired: { fontSize: 13, fontWeight: '600', color: C.danger, marginTop: 4 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  half: { flex: 1 },
});

export default InviteEmployeesScreen;
