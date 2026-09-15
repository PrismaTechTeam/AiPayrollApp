/**
 * Settings — the menu.
 * Grouped the way people already know from their phone's other apps: a bold
 * section title, one line saying what the group is for, then one row per
 * thing, each opening its own page. The rows are the same whether or not the
 * person has joined a company yet.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import accountService from '../api/services/accountService';
import { useAvatarUrl } from '../hooks/useAvatar';
import { useDialog } from '../components/ui/AppDialog';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card, MenuRow, Pill, SectionHeader } from '../components/account/AccountUi';

export const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = usePayrollAuth();
  const avatarUrl = useAvatarUrl(user?.uid);
  const dialog = useDialog();

  const initials = useMemo(() => {
    const a = (user?.firstName || user?.name || '?').charAt(0).toUpperCase();
    const b = (user?.lastName || '').charAt(0).toUpperCase();
    return `${a}${b}`;
  }, [user?.firstName, user?.lastName, user?.name]);

  // Re-read on every focus: the two-factor page changes this, and coming back
  // to a stale "Off" after enabling it reads as the change not having stuck.
  const [tfa, setTfa] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (user?.uid) {
        accountService
          .isTwoFactorEnabled(user.uid)
          .then((on) => { if (!cancelled) setTfa(on); })
          .catch(() => { if (!cancelled) setTfa(false); });
      }
      return () => { cancelled = true; };
    }, [user?.uid]),
  );

  const go = (screen: string) => navigation.navigate(screen as never);

  const signOut = async () => {
    const ok = await dialog.confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to continue.',
      confirmText: 'Sign out',
      cancelText: 'Stay',
      destructive: true,
    });
    if (ok) void logout();
  };

  return (
    <AccountPage title="Settings">
      {/* Who is signed in — tap to edit */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => go('AccountProfile')} accessibilityRole="button">
        <Card>
          <View style={styles.userRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.userText}>
              <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Your account'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={C.muted} />
          </View>
        </Card>
      </TouchableOpacity>

      <SectionHeader title="Your account" description="Password, security and personal details." />
      <Card padded={false}>
        <MenuRow icon="account-circle-outline" title="Profile" subtitle="Photo, first name, last name" onPress={() => go('AccountProfile')} />
        <MenuRow icon="lock-outline" title="Change Password" onPress={() => go('AccountPassword')} />
        <MenuRow
          icon="shield-check-outline"
          title="Two-Factor Authentication"
          onPress={() => go('AccountTwoFactor')}
          right={
            <View style={styles.rowRight}>
              {tfa === null ? <ActivityIndicator size="small" color={C.blue} /> : <Pill on={tfa} />}
              <MaterialCommunityIcons name="chevron-right" size={24} color={C.muted} />
            </View>
          }
          last={!user?.tenantId}
        />
        {/* The deployed API still wants a tenant on the devices endpoints (fixed in
            source, not yet shipped), so before HR approval the row would only show
            an error. Drop this condition once the backend with the fix is live. */}
        {user?.tenantId ? (
          <MenuRow icon="cellphone-link" title="Signed-in Devices" subtitle="See where your account is signed in" onPress={() => go('AccountDevices')} last />
        ) : null}
      </Card>

      <SectionHeader title="Support and legal" description="Help, policies and what this app is." />
      <Card padded={false}>
        <MenuRow icon="help-circle-outline" title="Help and Support" onPress={() => go('Help')} />
        <MenuRow icon="file-lock-outline" title="Privacy Policy" onPress={() => go('PrivacyPolicy')} />
        <MenuRow icon="information-outline" title="About" onPress={() => go('About')} last />
      </Card>

      <Card padded={false}>
        <MenuRow icon="logout" title="Sign Out" onPress={() => { void signOut(); }} danger right={<View />} last />
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#D8E6FB' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 22, fontWeight: '800', color: C.blue },
  userText: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '800', color: C.ink },
  userEmail: { fontSize: 13, color: C.body, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

export default AccountSettingsScreen;
