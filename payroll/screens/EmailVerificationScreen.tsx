/**
 * Email Verification Screen
 * Shown after registration to prompt user to verify their email (Phase 3)
 *
 * Visual language matches LoginScreen and RegisterScreen — this is the screen a
 * new account lands on straight after Register, so it shares AuthBackdrop, the
 * same palette and the same single floating card rather than the old solid-blue
 * header it used to carry.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { sendEmailVerification } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';
import { useDialog } from '../components/ui/AppDialog';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';

export const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const [resending, setResending] = useState(false);

  const handleOpenEmailApp = async () => {
    try {
      await Linking.openURL('mailto:');
    } catch {
      await dialog.notify({ title: 'Could not open email', message: 'No email app is set up on this phone.', tone: 'warning' });
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const firebaseAuth = getFirebaseAuth();
      const currentUser = firebaseAuth?.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        await dialog.notify({ title: 'Email sent', message: 'A new verification link has been sent to your email.', tone: 'success' });
      } else {
        // Only the Firebase SDK can send this mail, and it needs the signed-in
        // user. The backend endpoint the old fallback called does not send
        // anything, so it reported "Email Sent" for a mail that never left.
        await dialog.notify({
          title: 'Sign in first',
          message: 'Your session has ended. Sign in with your new account, then request the link again.',
          tone: 'warning',
        });
      }
    } catch (err: any) {
      await dialog.notify({ title: 'Could not resend', message: err.message || 'Failed to resend email. Please try again.', tone: 'danger' });
    } finally {
      setResending(false);
    }
  };

  const handleBackToSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Verify Email</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.iconRing}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="email-check-outline" size={44} color={C.blue} />
              </View>
            </View>

            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.description}>
              We&apos;ve sent a verification link to your email. Please verify your email address to
              continue.
            </Text>

            <PrimaryButton
              label="Open Email App"
              icon="email-open-outline"
              onPress={() => { void handleOpenEmailApp(); }}
            />

            <View style={styles.buttonGap} />

            <PrimaryButton
              label="Resend Email"
              icon="email-sync-outline"
              variant="outline"
              onPress={() => { void handleResendEmail(); }}
              loading={resending}
            />

            <TouchableOpacity
              style={styles.backLink}
              onPress={handleBackToSignIn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to Sign In"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={C.blue} />
              <Text style={styles.backLinkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footNote}>
            No email after a few minutes? Check your spam folder, then resend the link.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  safeArea: { flex: 1 },

  header: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 30 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  // Two rings rather than one flat disc: the pale outer halo keeps the icon from
  // sitting on the card as a hard blue coin.
  iconRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#F1F6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: 22,
    fontSize: 23,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 21,
    color: C.body,
    textAlign: 'center',
  },

  buttonGap: { height: 12 },

  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 6,
  },
  backLinkText: { fontSize: 14, fontWeight: '700', color: C.blue },

  footNote: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },
});

export default EmailVerificationScreen;
