/**
 * Claim types — what this company lets people claim for, and up to how much.
 *
 * Read-only, deliberately. Creating and editing a claim type exists only on the
 * web API behind [HasRight], so every Add/Edit/Delete button this screen used to
 * show answered 403 for anybody but an owner. A button that cannot work is worse
 * than no button: it teaches people the app is broken. Setting these up stays an
 * HR job on the dashboard.
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
import claimService, { ClaimType } from '../api/services/claimService';
import { serverMessage } from '../lib/serverMessage';
import { ClaimState, ClaimTypeRow, SectionHeading, goTo } from '../components/claims/ClaimUi';

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; types: ClaimType[] }
  | { kind: 'failed'; message: string };

export const ClaimTypesScreen: React.FC = () => {
  const navigation = useNavigation();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoad({ kind: 'ready', types: await claimService.getTypes() });
    } catch (err) {
      setLoad({ kind: 'failed', message: serverMessage(err, 'Could not load the claim types.') });
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

  const types = load.kind === 'ready' ? load.types : [];

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
            <Text style={styles.headerTitle}>Claim Types</Text>
            <Text style={styles.headerSubtitle}>
              {types.length === 0 ? 'What you can claim for' : `${types.length} you can claim for`}
            </Text>
          </View>
        </View>

        {load.kind === 'loading' ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : load.kind === 'failed' ? (
          <ClaimState
            icon="cloud-off-outline"
            title="Could not load the claim types"
            body={load.message}
            tone="danger"
            actionLabel="Try again"
            onAction={() => void onRefresh()}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
          >
            {types.length === 0 ? (
              <ClaimState
                icon="tag-outline"
                title="Nothing set up yet"
                body="Nobody has added a claim type for this company. HR sets these up on the web dashboard."
              />
            ) : (
              <>
                <SectionHeading title="ACTIVE TYPES" />
                <View style={styles.panel}>
                  {types.map((t, index) => (
                    <ClaimTypeRow key={t.id} type={t} last={index === types.length - 1} />
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.cta}
                  onPress={() => goTo(navigation, 'CreateClaim', {})}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color={C.blue} />
                  <Text style={styles.ctaText}>Make a claim</Text>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />
                </TouchableOpacity>

                <Text style={styles.footnote}>
                  Limits and receipt rules are set by HR on the web dashboard.
                </Text>
              </>
            )}
          </ScrollView>
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

  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  panel: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 14,
  },
  ctaText: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },

  footnote: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});

export default ClaimTypesScreen;
