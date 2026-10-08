/**
 * Forgot Password Screen
 * Requests a password reset email via backend (Firebase reset link).
 *
 * Built from the same pieces as LoginScreen — it is one tap from the sign-in
 * form, so a different look reads as a different app. The page used to explain
 * itself three times (subtitle, a paragraph in the card, a footnote) under a 62pt
 * tile, which put the Send button under the keyboard; now one line says it.
 * Problems show inline, and the confirmation replaces the form in place instead
 * of a dialog that then threw the person back to Login.
 */

import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import authService from '../api/services/authService';
import AuthBackdrop, {
  AUTH_COLORS as C,
  AuthCard,
  AuthField,
  AuthHeader,
  AuthNotice,
} from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { describeAuthError, looksLikeEmail } from '../lib/firebaseErrors';
import type { RootStackParamList } from '../navigation/types';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  // Login passes the address already typed there.
  const route = useRoute<RouteProp<RootStackParamList, 'ForgotPassword'>>();
  const inputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The address the link went to; set, the card shows the confirmation instead of the form.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const backToSignIn = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Login');
  };

  const handleSubmit = async () => {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('Enter the email you sign in with.');
      inputRef.current?.focus();
      return;
    }
    if (!looksLikeEmail(trimmed)) {
      setFieldError('This does not look like an email address.');
      inputRef.current?.focus();
      return;
    }

    setFieldError(null);
    setError(null);
    setLoading(true);
    try {
      // The server answers the same for an unknown address, so a failure here is
      // the network, the rate limit or the server — never "no such account".
      await authService.forgotPassword(trimmed);
      setSentTo(trimmed);
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Could not send the reset link. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader
              title="Reset password"
              subtitle="We will email you a link to set a new password."
              onBack={backToSignIn}
            />

            <AuthCard>
              {sentTo ? (
                <View style={styles.sent}>
                  <View style={styles.sentIcon}>
                    <MaterialCommunityIcons name="email-check-outline" size={26} color="#15803D" />
                  </View>
                  <Text style={styles.sentTitle}>Check your inbox</Text>
                  <Text style={styles.sentBody}>
                    If <Text style={styles.sentEmail}>{sentTo}</Text> has an account, the reset link is on its way.
                  </Text>
                  <View style={styles.actionGap} />
                  <PrimaryButton label="Back to sign in" icon="arrow-left" onPress={backToSignIn} />
                  <TouchableOpacity
                    style={styles.textButton}
                    onPress={() => {
                      setSentTo(null);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.textButtonLabel}>Use a different email</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <AuthNotice message={error} />
                  <AuthField
                    ref={inputRef}
                    label="Email"
                    icon="email-outline"
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (fieldError) setFieldError(null);
                    }}
                    error={fieldError}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    editable={!loading}
                    returnKeyType="send"
                    onSubmitEditing={() => { void handleSubmit(); }}
                  />
                  <View style={styles.actionGap} />
                  <PrimaryButton
                    label="Send reset link"
                    icon="send-outline"
                    onPress={() => { void handleSubmit(); }}
                    loading={loading}
                  />
                </>
              )}
            </AuthCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  actionGap: { height: 16 },

  sent: { alignItems: 'center', paddingTop: 4 },
  sentIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFDF3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sentTitle: { fontSize: 17, fontWeight: '700', color: C.ink, textAlign: 'center' },
  sentBody: { marginTop: 4, fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center' },
  sentEmail: { fontWeight: '700', color: C.ink },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4, alignSelf: 'stretch' },
  textButtonLabel: { fontSize: 14, fontWeight: '700', color: C.blue },
});

export default ForgotPasswordScreen;
