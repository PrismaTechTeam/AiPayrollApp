/**
 * Home
 * The one screen a signed-in person lands on, whether or not HR has let them
 * into a company yet. It says which companies they can open, whether a request
 * is waiting, and how to ask to join another. Lists live on their own pages.
 *
 * Registered under both route names — "UserHome" (no company yet) and
 * "TenantHub" (at least one company) — so older screens that navigate to the
 * hub still land here.
 *
 * Two frames for one list. As the first page (no company chosen yet) it has the
 * brand and the account button. Pushed from Home's company pill it is a plain
 * "Companies" page with a back arrow: it used to keep the brand header there,
 * with no way back but the system gesture, and two headings for one list.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { AccountPage, Card, MenuRow } from '../components/account/AccountUi';
import { DocumentState } from '../components/documents/DocumentUi';
import { roleLabel } from '../components/CompanySwitcher';
import { useDialog } from '../components/ui/AppDialog';
import { useAvatarUrl } from '../hooks/useAvatar';
import { parseServerDate, whenText } from '../lib/joinRequests';
import { serverMessage } from '../lib/serverMessage';
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

/**
 * The join requests, as three different states. A failed lookup used to become an empty list,
 * and so did "still loading": somebody waiting on HR saw "Join a company", sent a second
 * request, and was told "You already have a pending request".
 */
type Requests =
  | { kind: 'loading' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; list: JoinRequest[] };

export const UserHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { user, refreshAuthState, refreshTenants, switchCompany } = usePayrollAuth();
  const avatarUrl = useAvatarUrl(user?.uid);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || '';

  const tenants: TenantInfo[] = user?.availableTenants ?? [];
  const tenantCount = tenants.length;
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Requests>({ kind: 'loading' });

  // The two refreshers change identity whenever the stored user does, and refreshing the user is
  // exactly what they do. Depending on them made this effect re-run after every refresh it caused:
  // with an approved request and still no company, that was join-requests -> refresh -> new user
  // -> join-requests again, several requests a second until the server answered 429. Held in
  // refs, they are always current without being a reason to run again.
  const refreshAuthRef = useRef(refreshAuthState);
  const refreshTenantsRef = useRef(refreshTenants);
  useEffect(() => {
    refreshAuthRef.current = refreshAuthState;
    refreshTenantsRef.current = refreshTenants;
  });
  // An approved request is acted on once. If the refresh still finds no company (the membership
  // was removed again), asking again on every visit cannot change that.
  const refreshedFor = useRef(new Set<string>());

  const loadRequests = useCallback(async (isCancelled: () => boolean) => {
    try {
      const list = await companyService.getJoinRequests();
      if (isCancelled()) return;
      const sorted = [...list].sort(
        (a, b) => (parseServerDate(b.createdAt)?.getTime() ?? 0) - (parseServerDate(a.createdAt)?.getTime() ?? 0),
      );
      setRequests({ kind: 'ready', list: sorted });
      // Approved while the app was closed: the login state has not caught up
      // yet, and this is the earliest moment to notice.
      const fresh = sorted.filter((r) => r.status === 'APPROVED' && !refreshedFor.current.has(r.id));
      if (fresh.length > 0 && tenantCount === 0) {
        fresh.forEach((r) => refreshedFor.current.add(r.id));
        void refreshAuthRef.current();
      }
    } catch (err) {
      if (!isCancelled()) setRequests({ kind: 'failed', message: serverMessage(err, 'Could not load your requests.') });
    }
  }, [tenantCount]);

  // Refreshed every time this screen is looked at: it is the screen people come back to after
  // sending, cancelling, or being told a decision.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (tenantCount > 0) {
        // Membership can change on the server (HR approved a second company);
        // the stored list is only as fresh as the last login.
        void refreshTenantsRef.current();
      }
      void loadRequests(() => cancelled);
      return () => { cancelled = true; };
    }, [tenantCount, loadRequests]),
  );

  const retry = () => {
    setRequests({ kind: 'loading' });
    void loadRequests(() => false);
  };

  const list = requests.kind === 'ready' ? requests.list : [];
  const pending = list.find((r) => r.status === 'PENDING') ?? null;
  const requestCount = list.length;

  // Typed against the stack, so a route that no longer exists fails to build
  // instead of silently doing nothing when somebody taps.
  const go = <T extends keyof RootStackParamList>(screen: T, params?: RootStackParamList[T]) =>
    (navigation.navigate as (s: T, p?: RootStackParamList[T]) => void)(screen, params);

  // Home is usually already under this list (the switcher's "Manage companies" opened it):
  // go back to it rather than stacking a second Home on top.
  const openHome = () => navigation.navigate('PayrollHome', undefined, { pop: true });

  const openRequest = (r: JoinRequest) =>
    go('JoinRequestPending', { requestId: r.id, companyId: r.tenantId, companyName: r.tenantName });

  const openTenant = async (tenant: TenantInfo) => {
    if (tenant.id === user?.tenantId) {
      openHome();
      return;
    }
    setSwitchingId(tenant.id);
    try {
      await switchCompany(tenant.id);
      openHome();
    } catch (err) {
      await dialog.notify({
        title: 'Could not open company',
        message: serverMessage(err, 'Please try again.'),
        tone: 'danger',
      });
    } finally {
      setSwitchingId(null);
    }
  };

  // With no company, what to show depends entirely on the requests, so nothing is said until
  // they are known. With companies, the list is the point and the requests are a footnote.
  const noCompanyBody = (() => {
    if (tenantCount > 0) return null;
    if (requests.kind === 'loading') {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={C.blue} />
        </View>
      );
    }
    if (requests.kind === 'failed') {
      return (
        <DocumentState icon="cloud-off-outline" tone="danger" title="Could not check your requests" body={requests.message} onRetry={retry} />
      );
    }
    if (pending) return null;
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="office-building-outline" size={28} color={C.blue} />
        </View>
        <Text style={styles.cardTitle}>No company yet</Text>
        <Text style={styles.cardSubtitle}>Ask HR for an invite code or QR, then join.</Text>
        <PrimaryButton icon="plus" label="Join a company" onPress={() => go('JoinTenant')} />
      </View>
    );
  })();

  // Join is offered once the requests are known, so a slow lookup can never invite a duplicate of
  // a request already waiting. With no company and nothing waiting, the empty card above carries
  // the one "Join a company" button, so the list does not offer a second.
  const showJoinRow = tenantCount > 0 || (requests.kind === 'ready' && !!pending);
  const showList = tenantCount > 0 || !!pending || (requests.kind === 'ready' && requestCount > 0);

  // Companies, the request waiting on HR and the ways to join, in one card with dividers. They
  // were three cards, and the waiting request had a 56pt "View request" button for a status row.
  const listCard = showList ? (
    <Card padded={false}>
      {tenants.map((t) => {
        const current = t.id === user?.tenantId;
        const busy = switchingId === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            onPress={() => { void openTenant(t); }}
            disabled={switchingId !== null}
            activeOpacity={0.7}
            style={[styles.row, styles.divider]}
            accessibilityRole="button"
            accessibilityLabel={current ? `${t.name}, current company` : `Open ${t.name}`}
            accessibilityState={{ selected: current }}
          >
            {t.logoUrl ? (
              <Image source={{ uri: t.logoUrl }} style={styles.tenantLogo} />
            ) : (
              <View style={styles.tenantTile}>
                <Text style={styles.tenantTileText}>{tenantInitials(t.name)}</Text>
              </View>
            )}
            <View style={styles.flex}>
              <Text style={styles.rowTitle} numberOfLines={2}>{t.name}</Text>
              <Text style={styles.rowMeta}>{roleLabel(t.role)}</Text>
            </View>
            {/* The company in use is the active state, so it alone gets the blue check. */}
            {busy ? (
              <ActivityIndicator size="small" color={C.blue} />
            ) : current ? (
              <MaterialCommunityIcons name="check-circle" size={22} color={C.blue} />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
            )}
          </TouchableOpacity>
        );
      })}

      {pending ? (
        <TouchableOpacity
          onPress={() => openRequest(pending)}
          activeOpacity={0.7}
          style={[styles.row, styles.divider]}
          accessibilityRole="button"
          accessibilityLabel={`${pending.tenantName}, waiting for HR`}
        >
          <View style={styles.pendingTile}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#B45309" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle} numberOfLines={2}>{pending.tenantName}</Text>
            <Text style={styles.pendingMeta} numberOfLines={2}>
              Waiting for HR · sent {whenText(pending.createdAt)}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
        </TouchableOpacity>
      ) : null}

      {requestCount > 0 ? (
        <MenuRow
          icon="format-list-bulleted"
          title="Your join requests"
          onPress={() => go('MyJoinRequests')}
          last={!showJoinRow}
          right={
            <View style={styles.rowRight}>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{requestCount}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
            </View>
          }
        />
      ) : null}

      {showJoinRow ? (
        <MenuRow icon="plus" title={tenantCount > 0 ? 'Join another company' : 'Join a company'} onPress={() => go('JoinTenant')} last />
      ) : null}
    </Card>
  ) : null;

  // Pushed from Home's company pill: the standard page with a back arrow and a centred title.
  if (navigation.canGoBack()) {
    return (
      <AccountPage title="Companies" subtitle={user?.email || undefined}>
        {noCompanyBody}
        {listCard}
      </AccountPage>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            <Text style={styles.brandAccent}>Ai</Text>Payroll
          </Text>
          <TouchableOpacity
            style={styles.accountButton}
            onPress={() => go('AccountSettings')}
            accessibilityRole="button"
            accessibilityLabel="Account settings"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.accountPhoto} />
            ) : (
              <MaterialCommunityIcons name="account-circle-outline" size={26} color="#3B4A63" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.greeting} numberOfLines={1}>
            {firstName ? `Hi, ${firstName}` : 'Hi there'}
          </Text>
          {/* A quiet label, not a second heading under the greeting. */}
          {tenantCount > 0 ? <Text style={styles.sectionLabel}>Choose a company</Text> : null}

          {noCompanyBody}
          {listCard}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  brand: { fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.4 },
  brandAccent: { color: C.blue },
  accountButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E6ECF6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  accountPhoto: { width: 44, height: 44, borderRadius: 14 },

  greeting: { fontSize: 20, fontWeight: '700', color: C.ink, marginTop: 4, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: C.body, marginBottom: 8, marginLeft: 2 },

  // Rows of the one card
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  rowMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  // Initials on the soft tint: solid blue is kept for buttons and the active state.
  tenantLogo: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.field },
  tenantTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center' },
  tenantTileText: { fontSize: 15, fontWeight: '700', color: C.blue },
  pendingTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center' },
  pendingMeta: { fontSize: 12, color: '#B45309', marginTop: 2 },

  loading: { paddingVertical: 40, alignItems: 'center' },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: C.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: C.body, lineHeight: 20, textAlign: 'center', marginBottom: 16 },

  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countPill: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontWeight: '700', color: C.blue },
});

export default UserHomeScreen;
