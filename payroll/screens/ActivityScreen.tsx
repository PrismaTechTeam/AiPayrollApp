/**
 * Recent Activity
 * The person's own requests, leave, claims and payslips in this company,
 * newest first. Tapping a row opens that item, not the list it came from.
 *
 * Loading, failed and empty are three states: an outage says so and offers a
 * retry, and only a person with genuinely nothing yet is told "nothing yet".
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useRecentActivity, type Activity } from '../hooks/useRecentActivity';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { Card } from '../components/account/AccountUi';
import { Busy, DocumentState } from '../components/documents/DocumentUi';
import type { IconName } from '../components/auth/PrimaryButton';

/**
 * Every status the four sources send. Anything else is shown as itself in a
 * neutral pill: an unknown word used to fall through to "Cancelled", which is
 * how every saved draft came to look withdrawn.
 */
const PILL: Record<string, { bg: string; fg: string; label: string; icon: IconName }> = {
  DRAFT: { bg: '#EEF2F7', fg: '#64748B', label: 'Draft', icon: 'file-edit-outline' },
  PENDING: { bg: '#FFF4E5', fg: '#B45309', label: 'Pending', icon: 'clock-outline' },
  APPROVED: { bg: '#DCFCE7', fg: '#15803D', label: 'Approved', icon: 'check' },
  REJECTED: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Rejected', icon: 'close' },
  CANCELLED: { bg: '#EEF2F7', fg: '#64748B', label: 'Cancelled', icon: 'minus' },
  WITHDRAWN: { bg: '#EEF2F7', fg: '#64748B', label: 'Withdrawn', icon: 'undo-variant' },
  AVAILABLE: { bg: '#E8F0FE', fg: C.blue, label: 'Ready', icon: 'eye-outline' },
};

function pillFor(status: string): { bg: string; fg: string; label: string; icon: IconName } {
  const key = (status ?? '').toUpperCase();
  const known = PILL[key];
  if (known) return known;
  const words = key.toLowerCase().replace(/_/g, ' ');
  return { bg: '#EEF2F7', fg: '#64748B', label: words ? words[0].toUpperCase() + words.slice(1) : 'Unknown', icon: 'circle-small' };
}

export const ActivityScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = usePayrollAuth();
  const linked = !!user?.employeeId;
  const { load, reload } = useRecentActivity(linked, 15);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const open = (a: Activity) =>
    (navigation.navigate as (screen: string, params: object) => void)(a.link.screen, a.link.params);

  const subtitle = 'Your requests, leave, claims and payslips';

  const content = (() => {
    if (!linked) {
      return (
        <DocumentState
          icon="account-alert-outline"
          title="No employee record here"
          body={`Your own activity shows once HR links your account to an employee in ${user?.tenantName ?? 'this company'}.`}
        />
      );
    }
    if (load.kind === 'loading') return <Busy />;
    if (load.kind === 'failed') {
      return (
        <DocumentState
          icon="cloud-off-outline"
          tone="danger"
          title="Could not load your activity"
          body={load.message}
          onRetry={() => { void onRefresh(); }}
        />
      );
    }
    if (load.items.length === 0) {
      return (
        <DocumentState
          icon="history"
          title="Nothing yet"
          body="Your requests, leave, claims and payslips will show here."
        />
      );
    }
    return (
      <>
        {load.partial ? (
          <TouchableOpacity style={styles.partial} onPress={() => { void onRefresh(); }} accessibilityRole="button">
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B45309" />
            <Text style={styles.partialText}>Some items could not be loaded.</Text>
            <Text style={styles.partialAction}>Retry</Text>
          </TouchableOpacity>
        ) : null}
        <Card padded={false}>
          {load.items.map((a, index) => {
            const pill = pillFor(a.status);
            return (
              <TouchableOpacity
                key={a.key}
                style={[styles.row, index < load.items.length - 1 && styles.rowDivider]}
                onPress={() => open(a)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${a.title}. ${a.subtitle}. ${pill.label}`}
              >
                <View style={[styles.icon, { backgroundColor: `${a.tint}1A` }]}>
                  <MaterialCommunityIcons name={a.icon} size={20} color={a.tint} />
                </View>
                <View style={styles.text}>
                  <Text style={styles.title} numberOfLines={1}>{a.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{a.subtitle}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                  <MaterialCommunityIcons name={pill.icon} size={12} color={pill.fg} />
                  <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
      </>
    );
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1}>Recent activity</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void onRefresh(); }} tintColor={C.blue} colors={[C.blue]} />}
        >
          {content}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { minHeight: 52, paddingHorizontal: 8, justifyContent: 'center' },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.body, marginTop: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, flexGrow: 1 },

  partial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#FCE4BE',
    marginBottom: 10,
  },
  partialText: { flex: 1, fontSize: 13, color: '#8A5A16' },
  partialAction: { fontSize: 13, fontWeight: '700', color: '#B45309' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, minHeight: 60 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  icon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.body, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, flexShrink: 0 },
  pillText: { fontSize: 11, fontWeight: '700' },
});

export default ActivityScreen;
