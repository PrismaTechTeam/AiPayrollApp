/**
 * Login Screen
 * Firebase-based authentication with email/password.
 *
 * One phone screen, no scrolling: the brand, one heading, two labelled fields,
 * one button, centred as a group. The 2026-09-07 version spent half the height on a brand block, a
 * tilted ID card, a handwritten "People / Power / Progress", a pitch, a second
 * "Welcome Back!" heading and a copyright line, so the button sat under the
 * keyboard and people could not tell what the page wanted from them.
 *
 * Errors render inline — a field's own problem under that field, the server's
 * answer at the top of the card — instead of a native Alert, which covers the
 * field it refers to and reads as a crash.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth, setKeepSignedIn } from '../context/PayrollAuthContext';
import AuthBackdrop, {
  AUTH_COLORS as C,
  AuthCard,
  AuthField,
  AuthHeader,
  AuthNotice,
  AuthSwitchRow,
  useKeepFocusedInView,
} from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { describeAuthError, authErrorCode, looksLikeEmail } from '../lib/firebaseErrors';
import { isEmailNotVerified } from '../lib/emailVerification';

type FieldErrors = { email?: string; password?: string };

export const LoginScreen: React.FC = () => {
  const { login, sessionNotice, dismissSessionNotice } = usePayrollAuth();
  const navigation = useNavigation();
  const keep = useKeepFocusedInView();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keepSignedIn, setKeep] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (loading) return;
    const trimmed = email.trim();
    const errors: FieldErrors = {};
    if (!trimmed) errors.email = 'Enter your email address.';
    else if (!looksLikeEmail(trimmed)) errors.email = 'This does not look like an email address.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setError(null);
    dismissSessionNotice();
    setLoading(true);
    try {
      // Recorded before the call so the choice survives even if the app is
      // killed straight after a successful sign-in.
      await setKeepSignedIn(keepSignedIn);
      // On success the navigator swaps to the signed-in screens by itself.
      await login(trimmed, password);
    } catch (err) {
      // A new account that has not tapped its link: the verify page resends it and signs in after.
      if (isEmailNotVerified(err)) {
        navigation.navigate('EmailVerification', { email: err.email });
        return;
      }
      const message = describeAuthError(err, 'We could not sign you in. Please try again.');
      if (authErrorCode(err) === 'auth/invalid-email') {
        setFieldErrors({ email: message });
        emailRef.current?.focus();
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // The address typed here goes along, so it is not typed twice.
  const openForgotPassword = () => {
    const typed = email.trim();
    navigation.navigate('ForgotPassword', typed ? { email: typed } : undefined);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {/* "padding" on both platforms: the app draws edge to edge, so Android no
            longer shrinks the window for the keyboard and an undefined behaviour
            left the keyboard over the password field and the button. */}
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <ScrollView
            ref={keep.scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HR accounts are made on the web, and "the email you registered with"
                sent HR to Create account, which then said the email was taken. */}
            <AuthHeader title="Welcome back" subtitle="Same email and password as SayangHR on the web." />

            <AuthCard onLayout={keep.onCardLayout}>
              {error ? (
                <AuthNotice message={error} />
              ) : (
                <AuthNotice message={sessionNotice} tone="info" />
              )}

              <AuthField
                ref={emailRef}
                label="Email"
                icon="email-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                }}
                error={fieldErrors.email}
                onLayout={keep.onFieldLayout('email')}
                onFocus={() => keep.onFieldFocus('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                editable={!loading}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <AuthField
                ref={passwordRef}
                label="Password"
                icon="lock-outline"
                placeholder="Your password"
                secret
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                }}
                error={fieldErrors.password}
                onLayout={keep.onFieldLayout('password')}
                onFocus={() => keep.onFieldFocus('password')}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="password"
                textContentType="password"
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={() => { void handleLogin(); }}
              />

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.keepRow}
                  onPress={() => setKeep((v) => !v)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: keepSignedIn }}
                  accessibilityLabel="Keep me signed in"
                >
                  <View style={[styles.checkbox, keepSignedIn && styles.checkboxOn]}>
                    {keepSignedIn && <MaterialCommunityIcons name="check-bold" size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.keepLabel}>Keep me signed in</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgot}
                  onPress={openForgotPassword}
                  disabled={loading}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton label="Sign in" onPress={() => { void handleLogin(); }} loading={loading} />
            </AuthCard>

            {/* Right under the card, as one centred group. Pinned to the bottom it
                sat about 230pt below the form on a 390x800 phone and looked like
                it belonged to something else. */}
            <View style={styles.switchGap}>
              <AuthSwitchRow
                prompt="New here?"
                action="Create account"
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },
  // Centred when it fits; with the keyboard up the page is shorter than the
  // content and simply scrolls, so nothing is pushed off the top.
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  // Both are a full 44pt tall: the checkbox row used to be 21pt with no slop.
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, paddingRight: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: { backgroundColor: C.blue, borderColor: C.blue },
  keepLabel: { fontSize: 13, color: C.body },
  forgot: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  link: { fontSize: 13, fontWeight: '700', color: C.blue },

  switchGap: { marginTop: 12 },
});

export default LoginScreen;
