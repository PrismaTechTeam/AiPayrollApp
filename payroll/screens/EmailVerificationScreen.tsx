/**
 * Email Verification Screen
 * Says where the verification link went and lets the person carry on.
 *
 * Register no longer stops here — it signs the new account straight in, because
 * nothing checks verification and this page's only exit used to be "Back to Sign
 * In". It stays for the payrollapp://verify-email link, and now has a real way
 * forward: "Continue" signs in with the Firebase session this phone already holds,
 * when that session is for the address in the link.
 * Same pieces as LoginScreen; results show inline instead of in dialogs.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { onAuthStateChanged, sendEmailVerification, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';
import { describeAuthError } from '../lib/firebaseErrors';
import { usePayrollAuth, setKeepSignedIn, getDeviceId } from '../context/PayrollAuthContext';
import AuthBackdrop, { AUTH_COLORS as C, AuthCard, AuthHeader, AuthNotice } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';

export const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EmailVerification'>>();
  const { loginWithFirebaseToken } = usePayrollAuth();
  // Firebase restores its persisted user a moment after start-up, so it is
  // followed rather than read once — a deep link opened from cold would
  // otherwise offer only "Go to sign in".
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => getFirebaseAuth()?.currentUser ?? null);
  useEffect(() => {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) return undefined;
    return onAuthStateChanged(firebaseAuth, setFirebaseUser);
  }, []);
  // Only the address this page was opened for. Falling back to the Firebase
  // user's address showed a previous person's email to whoever opened the link,
  // and "Continue" then signed them in as that person (possibly HR) with no
  // password. The held session is offered only when it is the same address.
  const email = route.params?.email?.trim() || '';
  const heldEmail = firebaseUser?.email?.toLowerCase() ?? '';
  const ownSession = !!heldEmail && heldEmail === email.toLowerCase();

  const [resending, setResending] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);

  const backToSignIn = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Login');
  };

  // iOS: message:// opens the Mail inbox, where mailto: would open a blank new
  // message. Android has no portable "open the inbox" link — mailto: only starts
  // a draft — so the button is not offered there.
  const openMail = async () => {
    try {
      await Linking.openURL('message://');
    } catch {
      try {
        await Linking.openURL('mailto:');
      } catch {
        setNotice({ text: 'No mail app is set up on this phone.', tone: 'error' });
      }
    }
  };

  const handleResend = async () => {
    const current = getFirebaseAuth()?.currentUser;
    if (!current || !ownSession) return;
    setResending(true);
    setNotice(null);
    try {
      await sendEmailVerification(current);
      setNotice({ text: 'A new link is on its way.', tone: 'success' });
    } catch (err: unknown) {
      setNotice({ text: describeAuthError(err, 'Could not send the link. Please try again.'), tone: 'error' });
    } finally {
      setResending(false);
    }
  };

  const handleContinue = async () => {
    const current = getFirebaseAuth()?.currentUser;
    if (!current || !ownSession) {
      backToSignIn();
      return;
    }
    setContinuing(true);
    setNotice(null);
    try {
      const idToken = await current.getIdToken();
      await setKeepSignedIn(true);
      // Success swaps the navigator to the signed-in screens by itself.
      await loginWithFirebaseToken(idToken, await getDeviceId());
    } catch (err: unknown) {
      setNotice({ text: describeAuthError(err, 'We could not sign you in. Please try again.'), tone: 'error' });
    } finally {
      setContinuing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AuthHeader title="Check your inbox" onBack={backToSignIn} />

          <AuthCard>
            <View style={styles.top}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="email-check-outline" size={26} color={C.blue} />
              </View>
              <Text style={styles.body}>
                We sent a verification link to{' '}
                {email ? <Text style={styles.email}>{email}</Text> : 'your email'}.
              </Text>
            </View>

            {notice ? <AuthNotice message={notice.text} tone={notice.tone} /> : null}

            <View style={styles.gap} />
            {ownSession ? (
              <>
                <PrimaryButton
                  label="Continue"
                  icon="arrow-right"
                  onPress={() => { void handleContinue(); }}
                  loading={continuing}
                  disabled={resending}
                />
                <View style={styles.gapSmall} />
                <PrimaryButton
                  label="Resend link"
                  icon="email-sync-outline"
                  variant="outline"
                  onPress={() => { void handleResend(); }}
                  loading={resending}
                  disabled={continuing}
                  compact
                />
              </>
            ) : (
              <PrimaryButton label="Go to sign in" icon="login" onPress={backToSignIn} />
            )}

            {Platform.OS === 'ios' ? (
              <TouchableOpacity style={styles.textButton} onPress={() => { void openMail(); }} accessibilityRole="button">
                <Text style={styles.textButtonLabel}>Open Mail</Text>
              </TouchableOpacity>
            ) : null}
          </AuthCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },

  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.blueSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { flex: 1, fontSize: 14, lineHeight: 20, color: C.body },
  email: { fontWeight: '700', color: C.ink },
  gap: { height: 8 },
  gapSmall: { height: 10 },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  textButtonLabel: { fontSize: 14, fontWeight: '700', color: C.blue },
});

export default EmailVerificationScreen;
