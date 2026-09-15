/**
 * Recent Activity
 * Everything that has happened to this person's requests, leaves, payslips and
 * join requests, newest first. Tapping a row opens the section it came from.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useApproverAccess } from '../hooks/useApproverAccess';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { AccountPage, Card } from '../components/account/AccountUi';
import { STATUS_LOOK } from '../lib/joinRequests';

const PILL: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: STATUS_LOOK.PENDING.bg, fg: STATUS_LOOK.PENDING.fg, label: 'Pending' },
  APPROVED: { bg: STATUS_LOOK.APPROVED.bg, fg: STATUS_LOOK.APPROVED.fg, label: 'Approved' },
  REJECTED: { bg: STATUS_LOOK.REJECTED.bg, fg: STATUS_LOOK.REJECTED.fg, label: 'Rejected' },
  CANCELLED: { bg: STATUS_LOOK.CANCELLED.bg, fg: STATUS_LOOK.CANCELLED.fg, label: 'Cancelled' },
  WITHDRAWN: { bg: STATUS_LOOK.CANCELLED.bg, fg: STATUS_LOOK.CANCELLED.fg, label: 'Withdrawn' },
  AVAILABLE: { bg: '#DCFCE7', fg: '#15803D', label: 'Available' },
};

export const ActivityScreen: React.FC = () => {
  const navigation = useNavigation();
  const access = useApproverAccess();
  const { items, loading } = useRecentActivity(access.any, 20);

  return (
    <AccountPage title="Recent Activity" subtitle="Requests, leaves, payslips">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.blue} />
        </View>
      ) : items.length === 0 ? (
        <Card>
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="history" size={32} color={C.blue} />
            </View>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyBody}>Your requests, leaves and payslips will show here as they happen.</Text>
          </View>
        </Card>
      ) : (
        <Card padded={false}>
          {items.map((a, index) => {
            const pill = PILL[a.status] ?? PILL.CANCELLED;
            return (
              <TouchableOpacity
                key={a.key}
                style={[styles.row, index < items.length - 1 && styles.rowDivider]}
                onPress={() => navigation.navigate(a.screen as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.icon, { backgroundColor: `${a.tint}1A` }]}>
                  <MaterialCommunityIcons name={a.icon} size={20} color={a.tint} />
                </View>
                <View style={styles.text}>
                  <Text style={styles.title} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{a.subtitle}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
              </TouchableOpacity>
            );
          })}
        </Card>
      )}
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  emptyBody: { fontSize: 13, lineHeight: 19, color: C.body, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  icon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.body, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '700' },
});

export default ActivityScreen;
