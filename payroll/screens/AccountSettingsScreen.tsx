/**
 * Profile — the account menu.
 * Who is signed in at the top (tap to edit), the company this person is acting
 * for, then short groups, each row opening its own page. Sized to fit one phone
 * screen without scrolling: the rows are the list, so nothing here explains them.
 *
 * Titled "Profile" because that is the tab that opens it; it used to say
 * "Settings", and the page behind the name was also "Profile", so tapping
 * Profile led to Settings and then to a second Profile.
 *
 * The company row is for HR above all: an owner in several companies approves
 * for whichever one is active, and the only other clue is the shortened name on
 * Home. Privacy Policy is reached from About, so it is not repeated here.
 *
 * Inside a company this page is the bottom bar's Profile tab, so the bar stays
 * on it with Profile lit. Before a company (no company yet, or waiting for HR)
 * there is no home to go back to through a bar, so it keeps the back arrow.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useApproverAccess } from '../hooks/useApproverAccess';
import accountService from '../api/services/accountService';
import { useAvatarUrl } from '../hooks/useAvatar';
import { useDialog } from '../components/ui/AppDialog';
import { BottomNavBar, useBottomNavSpace } from '../components/BottomNavBar';
import { roleLabel } from '../components/CompanySwitcher';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card, MenuRow, Pill, SectionLabel } from '../components/account/AccountUi';

/** Loading, known on/off, or the lookup failed — which must not read as "Off". */
type TwoFactorState = 'loading' | 'on' | 'off' | 'unknown';

export const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout, authStatus } = usePayrollAuth();
  // The bar, the home indicator, and the Punch circle when there is one: Sign Out is the
  // last row and spans the width, so it must clear the circle too.
  const navSpace = useBottomNavSpace(!!user?.employeeId);
  const avatarUrl = useAvatarUrl(user?.uid);
  const dialog = useDialog();
  // Only the full app has PayrollHome and the other tabs to go to.
  const asTab = authStatus === 'authenticated' && !!user?.tenantId;
  // The invitation code is behind EMPLOYEE_PORTAL.VIEW; without the right the row would open a 403.
  const access = useApproverAccess();
  const canInvite = asTab && access.ready && access.employeePortal;

  const initials = useMemo(() => {
    const a = (user?.firstName || user?.name || '?').charAt(0).toUpperCase();
    const b = (user?.lastName || '').charAt(0).toUpperCase();
    return `${a}${b}`;
  }, [user?.firstName, user?.lastName, user?.name]);

  // Re-read on every focus: the two-factor page changes this, and coming back
  // to a stale "Off" after enabling it reads as the change not having stuck.
  const [tfa, setTfa] = useState<TwoFactorState>('loading');
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (user?.uid) {
        accountService
          .isTwoFactorEnabled(user.uid)
          .then((on) => { if (!cancelled) setTfa(on ? 'on' : 'off'); })
          // Unknown is not off. Saying "Off" here would state a guess as fact
          // to someone who may well have it on; the row just opens the page.
          .catch(() => { if (!cancelled) setTfa('unknown'); });
      }
      return () => { cancelled = true; };
    }, [user?.uid]),
  );

  const go = (screen: string) => navigation.navigate(screen as never);

  const companyCount = user?.availableTenants?.length ?? 0;
  const companySubtitle = companyCount > 1
    ? `${roleLabel(user?.role)} · ${companyCount} companies`
    : roleLabel(user?.role);

  const signOut = async () => {
    const ok = await dialog.confirm({
      title: 'Sign out?',
      // True on both servers: the one live today ends every session on sign-out,
      // the reworked one only this phone's. Ending the others on purpose is
      // "Sign out of all devices" on the Devices page.
      message: 'You will need to sign in again on this phone.',
      confirmText: 'Sign out',
      cancelText: 'Cancel',
      destructive: true,
    });
    if (ok) void logout();
  };

  return (
    <AccountPage
      title="Profile"
      hideBack={asTab}
      footer={asTab ? <BottomNavBar activeScreen="profile" /> : undefined}
      footerHeight={asTab ? navSpace + 12 : 0}
    >
      {/* Who is signed in — tap to edit. The chevron says it opens; a blue "Edit"
          beside it said the same thing again in the CTA colour. */}
      <Card padded={false}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => go('AccountProfile')}
          style={styles.userRow}
          accessibilityRole="button"
          accessibilityLabel={`${user?.name || 'Your account'}, edit photo and name`}
        >
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
          <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
        </TouchableOpacity>
      </Card>

      {/* Which company, and as what. Opens the company list, where switching and
          joining another one live; the same place Home's "Manage companies" goes. */}
      {asTab ? (
        <>
          <SectionLabel>Company</SectionLabel>
          <Card padded={false}>
            <MenuRow
              icon="domain"
              title={user?.tenantName || user?.company || 'Your company'}
              subtitle={companySubtitle}
              onPress={() => navigation.navigate('TenantHub', undefined, { pop: true })}
              last={!canInvite}
            />
            {canInvite ? (
              <MenuRow icon="qrcode" title="Invite employees" onPress={() => go('InviteEmployees')} last />
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionLabel>Security</SectionLabel>
      <Card padded={false}>
        <MenuRow icon="lock-outline" title="Change Password" onPress={() => go('AccountPassword')} />
        <MenuRow
          icon="shield-check-outline"
          title="Two-Factor Authentication"
          onPress={() => go('AccountTwoFactor')}
          right={
            <View style={styles.rowRight}>
              {tfa === 'loading' ? <ActivityIndicator size="small" color={C.blue} /> : null}
              {tfa === 'on' || tfa === 'off' ? <Pill on={tfa === 'on'} /> : null}
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
            </View>
          }
          last={!user?.tenantId}
        />
        {/* The deployed API still wants a tenant on the devices endpoints (fixed in
            source, not yet shipped), so before HR approval the row would only show
            an error. Drop this condition once the backend with the fix is live. */}
        {user?.tenantId ? (
          <MenuRow icon="cellphone-lock" title="Devices" onPress={() => go('AccountDevices')} last />
        ) : null}
      </Card>

      <SectionLabel>Support</SectionLabel>
      <Card padded={false}>
        <MenuRow icon="help-circle-outline" title="Help" onPress={() => go('Help')} />
        <MenuRow icon="information-outline" title="About" onPress={() => go('About')} />
        <MenuRow icon="logout" title="Sign Out" onPress={() => { void signOut(); }} danger right={<View />} last />
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  // 40pt, the same initials circle as the approval cards.
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.blueSoft },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 15, fontWeight: '700', color: C.blue },
  userText: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: C.ink },
  userEmail: { fontSize: 13, color: C.body, marginTop: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

export default AccountSettingsScreen;
