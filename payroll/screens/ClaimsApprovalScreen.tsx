/**
 * Claim Approval — the claims actually waiting on a decision.
 *
 * Two things were wrong with the screen this replaces. It asked for fifty claims
 * of any status, so approved and rejected ones sat in the queue with dead
 * buttons on them; and it offered Approve and Reject to everyone, because it
 * called the HR endpoints and assumed whoever got there was allowed to.
 *
 * Approving now needs CLAIM_APPLICATION.APPROVE, and so does reading this queue
 * — it is every employee's spending. Someone without it gets the locked card
 * below rather than a row of buttons that answer 403.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import claimService, { ClaimApplication } from '../api/services/claimService';
import { serverMessage, statusOfError } from '../lib/serverMessage';
import { useDialog } from '../components/ui/AppDialog';
import { ClaimCard, ClaimState, goTo, money } from '../components/claims/ClaimUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; claims: ClaimApplication[] }
  /** The caller may not review claims. Not a failure — an answer. */
  | { kind: 'locked'; message: string }
  | { kind: 'failed'; message: string };

export const ClaimsApprovalScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const page = await claimService.getPendingApprovals({ page: 1, pageSize: 100 });
      setLoad({ kind: 'ready', claims: page.items });
    } catch (err) {
      const message = serverMessage(err, 'Could not load the claims waiting for you.');
      setLoad(
        statusOfError(err) === 403
          ? { kind: 'locked', message }
          : { kind: 'failed', message },
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  };

  const openClaim = (claim: ClaimApplication) => {
    goTo(navigation, 'ClaimDetails', { claimId: claim.id, canApprove: true });
  };

  const approve = async (claim: ClaimApplication) => {
    const ok = await dialog.confirm({
      title: 'Approve this claim?',
      message: `${money(claim.amount)} to ${claim.employeeName ?? 'the employee'}. Approving sends it through to payroll.`,
      confirmText: 'Approve',
    });
    if (!ok) return;

    setActingOn(claim.id);
    try {
      await claimService.approveClaim(claim.id);
      await fetch();
    } catch (err) {
      await dialog.notify({ title: 'Could not approve', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setActingOn(null);
    }
  };

  const reject = async (claim: ClaimApplication) => {
    const reason = await dialog.prompt({
      title: 'Reject this claim',
      message: `${claim.employeeName ?? 'The employee'} sees this, so say what would make it claimable.`,
      placeholder: 'Reason for rejection',
      confirmText: 'Reject',
      required: true,
      multiline: true,
      maxLength: 1000,
      destructive: true,
    });
    if (!reason) return;

    setActingOn(claim.id);
    try {
      await claimService.rejectClaim(claim.id, reason);
      await fetch();
    } catch (err) {
      await dialog.notify({ title: 'Could not reject', message: serverMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setActingOn(null);
    }
  };

  const claims = load.kind === 'ready' ? load.claims : [];
  const total = claims.reduce((sum, c) => sum + c.amount, 0);

  const renderRow = ({ item }: { item: ClaimApplication }) => {
    const busy = actingOn === item.id;
    return (
      <View style={styles.row}>
        <ClaimCard claim={item} onPress={() => openClaim(item)} showEmployee />
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, styles.rejectAction]}
            onPress={() => { void reject(item); }}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Reject ${item.employeeName ?? 'this'} claim`}
          >
            <MaterialCommunityIcons name="close" size={16} color={C.danger} />
            <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, styles.approveAction]}
            onPress={() => { void approve(item); }}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Approve ${item.employeeName ?? 'this'} claim`}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                <Text style={[styles.actionText, styles.approveText]}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Claim Approval</Text>
            <Text style={styles.headerSubtitle}>
              {load.kind !== 'ready'
                ? 'Claims waiting on a decision'
                : claims.length === 0
                  ? 'Nothing waiting'
                  : `${claims.length} waiting · ${money(total)}`}
            </Text>
          </View>
        </View>

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'locked' ? (
          <ClaimState
            icon="lock-outline"
            title="Not yours to decide"
            body={`${load.message} Ask whoever runs payroll to give you the claim approval right.`}
            actionLabel="Go back"
            onAction={() => navigation.goBack()}
          />
        ) : load.kind === 'failed' ? (
          <ClaimState
            icon="cloud-off-outline"
            title="Could not load the queue"
            body={load.message}
            tone="danger"
            actionLabel="Try again"
            onAction={() => void onRefresh()}
          />
        ) : (
          <FlatList
            data={claims}
            keyExtractor={(c) => c.id}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              <ClaimState
                icon="check-circle-outline"
                title="Nothing waiting"
                body="Every claim has been decided. New ones appear here as they come in."
              />
            }
            ListFooterComponent={
              claims.length > 0 ? (
                <Text style={styles.footnote}>Newest first. Tap a claim to read it and see the receipt.</Text>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  row: { gap: 10 },

  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 14 },
  rejectAction: { borderWidth: 1, borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  approveAction: { backgroundColor: C.blue },
  actionText: { fontSize: 14, fontWeight: '700' },
  rejectText: { color: C.danger },
  approveText: { color: '#FFFFFF' },

  footnote: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 6 },
});

export default ClaimsApprovalScreen;
