/**
 * Claim types — what this company lets people claim for, and up to how much.
 *
 * Read-only, deliberately. Creating and editing a claim type exists only on the
 * web API behind [HasRight], so every Add/Edit/Delete button this screen used to
 * show answered 403 for anybody but an owner. A button that cannot work is worse
 * than no button: it teaches people the app is broken. Setting these up stays an
 * HR job on the dashboard.
 *
 * For an employee the limits shown are their own. HR can give one person a
 * limit of their own on a type, and printing the company default beside it
 * disagreed with what My Claims said that person had left.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
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
import PrimaryButton from '../components/auth/PrimaryButton';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import claimService, { ClaimBalance, ClaimType } from '../api/services/claimService';
import { serverMessage } from '../lib/serverMessage';
import { ClaimState, ClaimTypeRow, SectionHeading, goTo } from '../components/claims/ClaimUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; types: ClaimType[]; balances: ClaimBalance[] }
  | { kind: 'failed'; message: string };

export const ClaimTypesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = usePayrollAuth();
  /**
   * Only someone linked to an employee record can claim. An HR account without
   * one used to be offered "Make a claim", fill the whole form in, and learn at
   * Send that it was not linked to an employee in this company.
   */
  const canClaim = Boolean(user?.employeeId);

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [types, balances] = await Promise.all([
        claimService.getTypes(),
        // The balance is per employee and answers 403 without a link, so it is
        // only asked for when there is someone to ask about.
        canClaim ? claimService.getBalance().catch(() => [] as ClaimBalance[]) : Promise.resolve([] as ClaimBalance[]),
      ]);
      setLoad({ kind: 'ready', types, balances });
    } catch (err) {
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load the claim types.') });
    }
  }, [canClaim]);

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

  /** The spinner comes back while it runs, so a slow retry is visibly happening and cannot be tapped twice. */
  const retry = () => {
    setLoad({ kind: 'loading' });
    void fetch();
  };

  const types = load.kind === 'ready' ? load.types : [];
  const balances = load.kind === 'ready' ? load.balances : [];

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
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>Claim Types</Text>
            {/* HR without an employee record cannot claim, so "you can claim for"
                told them something untrue about themselves. */}
            <Text style={styles.headerSubtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {types.length === 0
                ? canClaim ? 'What you can claim for' : 'Active claim types'
                : canClaim ? `${types.length} you can claim for` : `${types.length} active`}
            </Text>
          </View>
        </View>

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'failed' ? (
          <View style={styles.centre}>
            <ClaimState
              icon="cloud-off-outline"
              title="Could not load the claim types"
              body={load.message}
              tone="danger"
              actionLabel="Try again"
              onAction={retry}
            />
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[styles.scroll, types.length === 0 && styles.scrollEmpty]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            >
              {types.length === 0 ? (
                <ClaimState icon="tag-outline" title="No claim types yet" />
              ) : (
                <>
                  <SectionHeading title="ACTIVE TYPES" />
                  <View style={styles.panel}>
                    {types.map((t, index) => (
                      <ClaimTypeRow
                        key={t.id}
                        type={t}
                        balance={balances.find((b) => b.claimTypeId === t.id) ?? null}
                        last={index === types.length - 1}
                      />
                    ))}
                  </View>

                  {/* Only HR needs telling where these are changed; an employee
                      cannot change them anywhere. */}
                  {!canClaim ? (
                    <Text style={styles.footnote}>Edit types and limits on the web dashboard.</Text>
                  ) : null}
                </>
              )}
            </ScrollView>

            {/* The one action on the page, pinned where a thumb finds it rather
                than at the end of however long the list of types runs. */}
            {canClaim && types.length > 0 ? (
              <View style={styles.footer}>
                <PrimaryButton
                  icon="plus"
                  label="Make a claim"
                  onPress={() => goTo(navigation, 'CreateClaim', {})}
                  compact
                />
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: { ...StyleSheet.absoluteFillObject, left: 64, right: 64, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.muted, marginTop: 1 },

  scroll: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 16 },
  /** The empty state sits in the middle of the screen, not in its top third. */
  scrollEmpty: { flexGrow: 1, justifyContent: 'center' },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  footnote: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 12, lineHeight: 17 },

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
});

export default ClaimTypesScreen;
