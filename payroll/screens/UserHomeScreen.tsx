/**
 * Home
 * The one screen a signed-in person lands on, whether or not HR has let them
 * into a company yet. It says which companies they can open, whether a request
 * is waiting, and how to ask to join another. Lists live on their own pages.
 *
 * Registered under both route names — "UserHome" (no company yet) and
 * "TenantHub" (at least one company) — so older screens that navigate to the
 * hub still land here.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import companyService, { JoinRequest } from '../api/services/companyService';
import type { TenantInfo } from '../api/services/authService';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { Card, MenuRow, SectionHeader } from '../components/account/AccountUi';
import { useDialog } from '../components/ui/AppDialog';
import { useAvatarUrl } from '../hooks/useAvatar';
import { parseServerDate, whenText } from '../lib/joinRequests';
import type { RootStackParamList } from '../navigation/types';

function tenantInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const UserHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user, refreshAuthState, refreshTenants, switchCompany } = usePayrollAuth();
  const avatarUrl = useAvatarUrl(user?.uid);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'User';
  const initials =
    firstName.charAt(0).toUpperCase() +
    (user?.lastName ? user.lastName.charAt(0).toUpperCase() : '');

  const tenants: TenantInfo[] = user?.availableTenants ?? [];
  const tenantCount = tenants.length;
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Requests, refreshed every time this screen is looked at: it is the screen
  // people come back to after sending, cancelling, or being told a decision.
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (tenantCount > 0) {
        // Membership can change on the server (HR approved a second company);
        // the stored list is only as fresh as the last login.
        void refreshTenants();
      }
      companyService
        .getJoinRequests()
        .then((list) => {
          if (cancelled) return;
          const sorted = [...list].sort(
            (a, b) => (parseServerDate(b.createdAt)?.getTime() ?? 0) - (parseServerDate(a.createdAt)?.getTime() ?? 0),
          );
          setRequests(sorted);
          // Approved while the app was closed: the login state has not caught up
          // yet, and this is the earliest moment to notice.
          if (sorted.some((r) => r.status === 'APPROVED') && tenantCount === 0) {
            void refreshAuthState();
          }
        })
        .catch(() => {
          if (!cancelled) setRequests((prev) => prev ?? []);
        });
      return () => { cancelled = true; };
    }, [tenantCount, refreshAuthState, refreshTenants]),
  );

  const pending = (requests ?? []).find((r) => r.status === 'PENDING') ?? null;
  const requestCount = requests?.length ?? 0;

  // Typed against the stack, so a route that no longer exists fails to build
  // instead of silently doing nothing when somebody taps.
  const go = <T extends keyof RootStackParamList>(screen: T, params?: RootStackParamList[T]) =>
    (navigation.navigate as (s: T, p?: RootStackParamList[T]) => void)(screen, params);

  const openRequest = (r: JoinRequest) =>
    go('JoinRequestPending', { requestId: r.id, companyId: r.tenantId, companyName: r.tenantName });

  const openTenant = async (tenant: TenantInfo) => {
    if (tenant.id === user?.tenantId) {
      go('PayrollHome');
      return;
    }
    setSwitchingId(tenant.id);
    try {
      await switchCompany(tenant.id);
      go('PayrollHome');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await dialog.notify({
        title: 'Could not open company',
        message: e?.response?.data?.message ?? e?.message ?? 'Please try again.',
        tone: 'danger',
      });
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>
            <Text style={styles.brandAccent}>Ai</Text>Payroll
          </Text>
          <TouchableOpacity
            style={styles.accountButton}
            onPress={() => go('AccountSettings')}
            accessibilityRole="button"
            accessibilityLabel="Account settings"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.accountPhoto} />
            ) : (
              <MaterialCommunityIcons name="account-circle-outline" size={26} color="#3B4A63" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.greetingText}>
              <Text style={styles.greetingSmall}>Good to see you,</Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                Hi, {firstName}!
              </Text>
              <Text style={styles.greetingHint}>
                {tenantCount > 0 ? 'Pick a company to open it.' : 'Manage your companies, payroll and more.'}
              </Text>
            </View>
          </View>

          {/* Companies this person belongs to */}
          {tenantCount > 0 ? (
            <>
              <SectionHeader title="Your companies" />
              <Card padded={false}>
                {tenants.map((t, index) => {
                  const current = t.id === user?.tenantId;
                  const busy = switchingId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => { void openTenant(t); }}
                      disabled={switchingId !== null}
                      activeOpacity={0.7}
                      style={[styles.tenantRow, index < tenantCount - 1 && styles.tenantDivider]}
                      accessibilityRole="button"
                    >
                      {t.logoUrl ? (
                        <Image source={{ uri: t.logoUrl }} style={styles.tenantLogo} />
                      ) : (
                        <View style={styles.tenantTile}>
                          <Text style={styles.tenantTileText}>{tenantInitials(t.name)}</Text>
                        </View>
                      )}
                      <View style={styles.flex}>
                        <Text style={styles.tenantName} numberOfLines={2}>{t.name}</Text>
                        <Text style={styles.tenantRole}>{t.role || 'Member'}{current ? ' · Current' : ''}</Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator size="small" color={C.blue} />
                      ) : current ? (
                        <MaterialCommunityIcons name="check-circle" size={22} color={C.blue} />
                      ) : (
                        <MaterialCommunityIcons name="chevron-right" size={24} color={C.muted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </Card>
            </>
          ) : null}

          {/* A request is with HR */}
          {pending ? (
            <Card>
              <View style={styles.pendingRow}>
                <View style={styles.pendingIcon}>
                  <MaterialCommunityIcons name="clock-outline" size={26} color="#D97706" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.pendingTitle}>Waiting for HR approval</Text>
                  <Text style={styles.pendingCompany} numberOfLines={2}>{pending.tenantName}</Text>
                  <Text style={styles.pendingMeta}>Submitted {whenText(pending.createdAt)}</Text>
                </View>
              </View>
              <PrimaryButton icon="eye-outline" label="View Request" onPress={() => openRequest(pending)} />
            </Card>
          ) : null}

          {/* Nothing at all yet */}
          {tenantCount === 0 && !pending ? (
            <View style={styles.emptyCard}>
              <View style={styles.illustration}>
                <MaterialCommunityIcons name="cloud" size={156} color="#E4EDFB" style={styles.cloud} />
                <MaterialCommunityIcons name="city-variant" size={96} color="#C3D3EC" />
                <View style={styles.plusBadge}>
                  <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.cardTitle}>No Tenant Joined Yet</Text>
              <Text style={styles.cardSubtitle}>
                You haven't joined any company/tenant yet.{'\n'}Get started by joining a tenant.
              </Text>
              <PrimaryButton icon="plus" label="Join a Tenant" onPress={() => go('JoinTenant')} />
            </View>
          ) : null}

          {/* Everything else has its own page */}
          {tenantCount > 0 || requestCount > 0 || pending ? (
            <Card padded={false}>
              {requestCount > 0 ? (
                <MenuRow
                  icon="format-list-bulleted"
                  title="Your Requests"
                  subtitle="Every company you asked to join"
                  onPress={() => go('MyJoinRequests')}
                  right={
                    <View style={styles.rowRight}>
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{requestCount}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={C.muted} />
                    </View>
                  }
                />
              ) : null}
              <MenuRow icon="plus" title="Join Another Company" onPress={() => go('JoinTenant')} last />
            </Card>
          ) : null}

          {tenantCount === 0 ? (
            <View style={styles.helpCard}>
              <View style={styles.helpIcon}>
                <MaterialCommunityIcons name="information-outline" size={22} color={C.blue} />
              </View>
              <View style={styles.helpText}>
                <Text style={styles.helpTitle}>Need an invitation?</Text>
                <Text style={styles.helpBody}>Contact your HR if you need an invitation code or QR.</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  brand: { fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  brandAccent: { color: C.blue },
  accountButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E6ECF6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  accountPhoto: { width: 48, height: 48, borderRadius: 16 },

  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D8E6FB', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: C.blue },
  greetingText: { flex: 1 },
  greetingSmall: { fontSize: 14, color: C.body },
  greetingName: { fontSize: 24, fontWeight: '800', color: C.ink, marginTop: 2 },
  greetingHint: { fontSize: 13, color: C.muted, marginTop: 4 },

  // Companies
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  tenantDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  tenantLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.field },
  tenantTile: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center' },
  tenantTileText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  tenantName: { fontSize: 16, fontWeight: '700', color: C.ink },
  tenantRole: { fontSize: 13, color: C.body, marginTop: 2 },

  // Pending
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  pendingIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center' },
  pendingTitle: { fontSize: 13, fontWeight: '700', color: '#B45309', letterSpacing: 0.3, textTransform: 'uppercase' },
  pendingCompany: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 2 },
  pendingMeta: { fontSize: 13, color: C.body, marginTop: 2 },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  illustration: { width: 190, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cloud: { position: 'absolute', top: -4 },
  plusBadge: {
    position: 'absolute',
    right: 24,
    bottom: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.blue,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 8 },
  cardSubtitle: { fontSize: 14, color: C.body, lineHeight: 21, textAlign: 'center', marginBottom: 22 },

  // Rows
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countPill: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontWeight: '800', color: C.blue },

  // Help
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 6,
  },
  helpIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  helpText: { flex: 1 },
  helpTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  helpBody: { fontSize: 13, color: C.body, lineHeight: 18, marginTop: 2 },
});

export default UserHomeScreen;
