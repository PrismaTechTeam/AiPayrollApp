/**
 * Join requests
 * Every company this person has asked to join, newest first, with how each
 * one was decided. The home screen only says whether something is waiting;
 * the list lives here.
 *
 * Loading, could-not-load and genuinely-empty are three different states. A
 * failed load used to show "No requests yet" with a join button, so someone
 * whose request was waiting was told they had none, sent another, and got
 * "You already have a pending request" back.
 */

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import companyService, { JoinRequest } from '../api/services/companyService';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { AccountPage, Card, ErrorLine, LoadFailed, SectionHeader } from '../components/account/AccountUi';
import { whenText, STATUS_LOOK, statusKey, newestFirst } from '../lib/joinRequests';
import { serverMessage } from '../lib/serverMessage';

/** Two letters for the company tile, e.g. "PT" for PRISMA TECHNOLOGY. */
function initials(name: string | null | undefined): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export const MyJoinRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await companyService.getJoinRequests();
      if (!alive.current) return;
      setRequests(newestFirst(list));
      setLoadError(null);
    } catch (err) {
      // Whatever was loaded before stays on screen; the error says it may be stale.
      if (alive.current) setLoadError(serverMessage(err, 'Check your connection and try again.'));
    }
  }, []);

  // Again on every visit: this is where people come back to after cancelling
  // one or being told a decision.
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void load();
      return () => {
        alive.current = false;
      };
    }, [load]),
  );

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  const open = (r: JoinRequest) => {
    navigation.navigate('JoinRequestPending', {
      requestId: r.id,
      companyId: r.tenantId,
      companyName: r.tenantName,
    });
  };

  const inProgress = (requests ?? []).filter((r) => r.status === 'PENDING');
  const decided = (requests ?? []).filter((r) => r.status !== 'PENDING');

  const renderRows = (list: JoinRequest[]) => (
    <Card padded={false}>
      {list.map((r, index) => {
        const look = STATUS_LOOK[statusKey(r.status)];
        return (
          <TouchableOpacity
            key={r.id}
            onPress={() => open(r)}
            activeOpacity={0.7}
            style={[styles.row, index < list.length - 1 && styles.rowDivider]}
            accessibilityRole="button"
            accessibilityLabel={`${r.tenantName}, ${look.label}`}
          >
            {/* A neutral company tile: the pill is the one place the status shows.
                A coloured status icon beside a coloured pill said it twice. */}
            <View style={styles.tile}>
              <Text style={styles.tileText}>{initials(r.tenantName)}</Text>
            </View>
            <View style={styles.text}>
              {/* Two lines: next to the pill and chevron one line cut off names
                  such as "PRISMA TECHNOLOGY SOLUTION SDN BHD". */}
              <Text style={styles.company} numberOfLines={2}>{r.tenantName}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {r.status === 'PENDING' ? 'Sent ' : ''}
                {whenText(r.status === 'PENDING' ? r.createdAt : r.reviewedAt ?? r.createdAt)}
              </Text>
              {r.status === 'REJECTED' && r.rejectionReason ? (
                <Text style={styles.reason} numberOfLines={2}>{r.rejectionReason}</Text>
              ) : null}
            </View>
            <View style={[styles.pill, { backgroundColor: look.bg }]}>
              <Text style={[styles.pillText, { color: look.fg }]}>{look.label}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  const renderBody = () => {
    if (requests === null) {
      return loadError ? (
        <LoadFailed
          title="Could not load your requests"
          message={loadError}
          onRetry={() => { void retry(); }}
          busy={retrying}
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      );
    }

    if (requests.length === 0) {
      return (
        <Card>
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="inbox-outline" size={26} color={C.blue} />
            </View>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyBody}>Get the invitation code from HR, then send a request.</Text>
          </View>
          <PrimaryButton icon="plus" label="Join a company" onPress={() => navigation.navigate('JoinTenant')} />
        </Card>
      );
    }

    return (
      <>
        {loadError ? (
          <View style={styles.staleBox}>
            <ErrorLine message={`This list may be out of date. ${loadError}`} />
          </View>
        ) : null}
        {inProgress.length > 0 ? (
          <>
            <SectionHeader title="Waiting for HR" />
            {renderRows(inProgress)}
          </>
        ) : null}
        {decided.length > 0 ? (
          <>
            <SectionHeader title="Earlier" />
            {renderRows(decided)}
          </>
        ) : null}
      </>
    );
  };

  return (
    <AccountPage title="Join requests" subtitle="Companies you asked to join">
      {renderBody()}
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: 32 },
  empty: { alignItems: 'center', gap: 6, paddingBottom: 14 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  emptyBody: { fontSize: 13, lineHeight: 18, color: C.body, textAlign: 'center' },
  staleBox: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  tile: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center' },
  tileText: { fontSize: 13, fontWeight: '700', color: C.blue },
  text: { flex: 1 },
  company: { fontSize: 15, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.body, marginTop: 2 },
  reason: { fontSize: 12, color: C.danger, marginTop: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
});

export default MyJoinRequestsScreen;
