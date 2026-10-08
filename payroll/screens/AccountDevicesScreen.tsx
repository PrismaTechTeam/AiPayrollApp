/**
 * Devices.
 * The phones that receive this account's push notifications, newest activity
 * first, with a way to stop notifications to any of them, and under them a way
 * to end every session of the account.
 *
 * The list is the server's push-token table, not its sessions: removing a row
 * only switches that phone's notifications off and leaves its sign-in alone,
 * which is why each row's button is a bell, not "sign out". A phone that opens
 * the app again registers again.
 *
 * Ending sessions is the separate "Sign out of all devices" button. The server
 * cannot end one other phone's session, only all of them, so that is what the
 * button offers. It is what an HR user who lost a phone needs: that phone can
 * still approve until its session ends. It does not depend on the list, so it
 * shows while the list loads, fails or is empty.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import profileService, { SignedInDevice } from '../api/services/profileService';
import { accountErrorMessage } from '../api/services/accountService';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { AccountPage, Card, LoadFailed, SectionLabel, useSignOutEverywhere } from '../components/account/AccountUi';
import { useDialog } from '../components/ui/AppDialog';

/** "ios" -> "iPhone", "android" -> "Android phone": the server stores the lowercase platform. */
function platformName(platform: string | null): string | null {
  const p = (platform || '').toLowerCase();
  if (p.includes('ios')) return 'iPhone';
  if (p.includes('android')) return 'Android phone';
  return null;
}

function describeDevice(d: SignedInDevice): string {
  const kind = platformName(d.platform);
  const name = d.deviceModel || kind || 'Phone';
  if (!d.osVersion) return name;
  const os = kind === 'iPhone' ? 'iOS' : kind === 'Android phone' ? 'Android' : 'OS';
  return `${name} · ${os} ${d.osVersion}`;
}

function whenText(iso: string | null | undefined): string {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const now = Date.now();
  const minutes = Math.round((now - date.getTime()) / 60000);
  if (minutes < 2) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  // "14 Sep 2026" in Malaysia time like every other date in the app; the phone's own
  // locale turned it into "Sep 14, 2026" on a phone set to US English.
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' });
}

/** Still asking, the list (possibly empty), or the request failed. Three states, never merged. */
type Load = { kind: 'loading' } | { kind: 'ready'; devices: SignedInDevice[] } | { kind: 'failed'; message: string };

export const AccountDevicesScreen: React.FC = () => {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [retrying, setRetrying] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const dialog = useDialog();
  const { busy: endingAll, signOutEverywhere } = useSignOutEverywhere();

  const load = useCallback(async () => {
    try {
      setState({ kind: 'ready', devices: await profileService.getDevices() });
    } catch (err) {
      setState({ kind: 'failed', message: accountErrorMessage(err, 'Check your connection and try again.') });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  const remove = async (device: SignedInDevice) => {
    const ok = await dialog.confirm({
      title: 'Stop notifications?',
      message: `${describeDevice(device)} stops getting AiPayroll notifications. They start again the next time the app is opened on it.`,
      confirmText: 'Stop',
      destructive: true,
    });
    if (!ok) return;
    setRemoving(device.id);
    try {
      await profileService.removeDevice(device.id);
      setState((s) => (s.kind === 'ready' ? { kind: 'ready', devices: s.devices.filter((d) => d.id !== device.id) } : s));
    } catch (err) {
      await dialog.notify({ title: 'Could not stop notifications', message: accountErrorMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setRemoving(null);
    }
  };

  const endAll = async () => {
    const ok = await dialog.confirm({
      title: 'Sign out everywhere?',
      message: 'Every phone and browser, including this one, will need to sign in again.',
      confirmText: 'Sign out everywhere',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (ok) await signOutEverywhere();
  };

  const devices = state.kind === 'ready' ? state.devices : [];

  return (
    <AccountPage title="Devices">
      <SectionLabel>Getting notifications</SectionLabel>
      {state.kind === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : state.kind === 'failed' ? (
        <LoadFailed title="Could not load your devices" message={state.message} onRetry={() => { void retry(); }} busy={retrying} />
      ) : devices.length === 0 ? (
        <Card>
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-off-outline" size={32} color={C.muted} />
            <Text style={styles.emptyTitle}>No devices get notifications</Text>
            <Text style={styles.emptyBody}>A phone appears here once it allows AiPayroll notifications.</Text>
          </View>
        </Card>
      ) : (
        <Card padded={false}>
          {devices.map((d, index) => (
            <View key={d.id} style={[styles.row, index < devices.length - 1 && styles.rowDivider]}>
              <View style={styles.icon}>
                <MaterialCommunityIcons
                  name={(d.platform || '').toLowerCase().includes('ios') ? 'apple' : 'android'}
                  size={22}
                  color={C.body}
                />
              </View>
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={1}>{describeDevice(d)}</Text>
                <Text style={styles.meta} numberOfLines={1}>Last active {whenText(d.lastUsedAt ?? d.createdAt)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => { void remove(d); }}
                disabled={removing !== null}
                style={styles.removeButton}
                accessibilityRole="button"
                accessibilityLabel={`Stop notifications to ${describeDevice(d)}`}
              >
                {removing === d.id ? (
                  <ActivityIndicator size="small" color={C.danger} />
                ) : (
                  <MaterialCommunityIcons name="bell-off-outline" size={20} color={C.danger} />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      <SectionLabel>Sessions</SectionLabel>
      <PrimaryButton
        icon="logout-variant"
        label="Sign out of all devices"
        onPress={() => { void endAll(); }}
        loading={endingAll}
        variant="danger"
        compact
      />
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 32 },
  empty: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 4 },
  emptyBody: { fontSize: 13, lineHeight: 18, color: C.body, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  icon: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.body, marginTop: 1 },
  removeButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center' },
});

export default AccountDevicesScreen;
