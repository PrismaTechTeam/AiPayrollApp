/**
 * Your Requests
 * Every company this person has asked to join, newest first, with how each
 * one was decided. The home screen only says whether something is waiting;
 * the list lives here.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import companyService, { JoinRequest } from '../api/services/companyService';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { AccountPage, Card, SectionHeader } from '../components/account/AccountUi';
import { parseServerDate, whenText, STATUS_LOOK, statusKey } from '../lib/joinRequests';

export const MyJoinRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      companyService
        .getJoinRequests()
        .then((list) => {
          if (cancelled) return;
          setRequests(
            [...list].sort(
              (a, b) => (parseServerDate(b.createdAt)?.getTime() ?? 0) - (parseServerDate(a.createdAt)?.getTime() ?? 0),
            ),
          );
        })
        .catch(() => {
          if (!cancelled) setRequests((prev) => prev ?? []);
        });
      return () => { cancelled = true; };
    }, []),
  );

  const open = (r: JoinRequest) => {
    navigation.navigate('JoinRequestPending', {
      requestId: r.id,
      companyId: r.tenantId,
      companyName: r.tenantName,
    } as never);
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
          >
            <View style={[styles.icon, { backgroundColor: look.bg }]}>
              <MaterialCommunityIcons name={look.icon} size={20} color={look.fg} />
            </View>
            <View style={styles.text}>
              <Text style={styles.company} numberOfLines={1}>{r.tenantName}</Text>
              <Text style={styles.meta}>
                {r.status === 'PENDING' ? 'Submitted ' : ''}
                {whenText(r.status === 'PENDING' ? r.createdAt : r.reviewedAt ?? r.createdAt)}
              </Text>
              {r.status === 'REJECTED' && r.rejectionReason ? (
                <Text style={styles.reason} numberOfLines={2}>{r.rejectionReason}</Text>
              ) : null}
            </View>
            <View style={[styles.pill, { backgroundColor: look.bg }]}>
              <Text style={[styles.pillText, { color: look.fg }]}>{look.label}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  return (
    <AccountPage title="Your Requests" subtitle="Companies you asked to join">
      {requests === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : requests.length === 0 ? (
        <Card>
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="inbox-outline" size={34} color={C.blue} />
            </View>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyBody}>When you ask to join a company, it shows up here with its status.</Text>
            <View style={styles.gap} />
            <PrimaryButton icon="plus" label="Join a Tenant" onPress={() => navigation.navigate('JoinTenant')} />
          </View>
        </Card>
      ) : (
        <>
          {inProgress.length > 0 ? (
            <>
              <SectionHeader title="In progress" description="Waiting for HR to decide." />
              {renderRows(inProgress)}
            </>
          ) : null}
          {decided.length > 0 ? (
            <>
              <SectionHeader title="Earlier" description="Requests that have been decided or withdrawn." />
              {renderRows(decided)}
            </>
          ) : null}
        </>
      )}
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  gap: { height: 8, width: '100%' },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  emptyBody: { fontSize: 14, lineHeight: 21, color: C.body, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1 },
  company: { fontSize: 15, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.body, marginTop: 2 },
  reason: { fontSize: 12, color: C.danger, marginTop: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '700' },
});

export default MyJoinRequestsScreen;
