/**
 * Signed-in Devices.
 * Every phone that holds a live session for this account, newest activity
 * first, with a way to end any of them. Ending one revokes its tokens on the
 * server; that phone is asked to sign in again on its next request.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import profileService, { SignedInDevice } from '../api/services/profileService';
import { describeAuthError } from '../lib/firebaseErrors';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card, ErrorLine } from '../components/account/AccountUi';
import { useDialog } from '../components/ui/AppDialog';

function describeDevice(d: SignedInDevice): string {
  const parts = [d.deviceModel, d.platform, d.osVersion ? `OS ${d.osVersion}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : d.deviceType || 'Mobile device';
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
  if (hours < 24) return `${hours} h ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const AccountDevicesScreen: React.FC = () => {
  const [devices, setDevices] = useState<SignedInDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const dialog = useDialog();

  const load = useCallback(async () => {
    setError(null);
    try {
      setDevices(await profileService.getDevices());
    } catch (err) {
      setDevices([]);
      setError(describeAuthError(err, 'Could not load your devices. Pull down to try again.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = async (device: SignedInDevice) => {
    const ok = await dialog.confirm({
      title: 'Sign out this device?',
      message: `${describeDevice(device)} will need to sign in again.`,
      confirmText: 'Sign out',
      destructive: true,
    });
    if (!ok) return;
    setRemoving(device.id);
    try {
      await profileService.removeDevice(device.id);
      setDevices((list) => (list ?? []).filter((d) => d.id !== device.id));
    } catch (err) {
      await dialog.notify({ title: 'Could not sign out that device', message: describeAuthError(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <AccountPage title="Signed-in Devices" subtitle="Where your account is active">
      <ErrorLine message={error} />
      {devices === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : devices.length === 0 ? (
        <Card>
          <View style={styles.center}>
            <MaterialCommunityIcons name="cellphone-off" size={40} color={C.muted} />
            <Text style={styles.emptyTitle}>No other devices</Text>
            <Text style={styles.emptyBody}>Only sessions that signed in through the app appear here.</Text>
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
                  color={C.blue}
                />
              </View>
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={1}>{describeDevice(d)}</Text>
                <Text style={styles.meta}>Last active {whenText(d.lastUsedAt ?? d.createdAt)}</Text>
                <Text style={styles.meta}>Signed in {whenText(d.createdAt)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => { void remove(d); }}
                disabled={removing !== null}
                style={styles.removeButton}
                accessibilityRole="button"
                accessibilityLabel="Sign out this device"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {removing === d.id ? (
                  <ActivityIndicator size="small" color={C.danger} />
                ) : (
                  <MaterialCommunityIcons name="logout" size={20} color={C.danger} />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}
      <Text style={styles.footnote}>
        Signing out a device revokes its access the next time it talks to the server. It does not delete anything.
      </Text>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 6 },
  emptyBody: { fontSize: 13, lineHeight: 19, color: C.body, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.body, marginTop: 2 },
  removeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center' },
  footnote: { fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 4, marginHorizontal: 6 },
});

export default AccountDevicesScreen;
