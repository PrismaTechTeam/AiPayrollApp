/**
 * Register Screen
 * Creates the account in Firebase first, then syncs it to the backend (so login works).
 *
 * Visual language matches LoginScreen — the two screens link straight to each other, so
 * they share AuthBackdrop and the same palette. Errors render inline in the card rather
 * than through Alert: a native dialog covers the field it is complaining about, and on
 * this form the complaint is almost always about one specific field.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  deleteUser,
} from 'firebase/auth';
import Constants from 'expo-constants';
import authService from '../api/services/authService';
import { API_CONFIG } from '../api/config';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { describeAuthError, responseStatus } from '../lib/firebaseErrors';

type FieldName = 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<FieldName | null>(null);

  const validate = (): string | null => {
    if (!firstName.trim()) return 'First name is required';
    if (!lastName.trim()) return 'Last name is required';
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleRegister = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!isFirebaseConfigured()) {
      setError(
        'Sign-up is not available: Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to AiPayrollApp/.env (see FIREBASE_SETUP.md).',
      );
      return;
    }
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      setError('Sign-up is not available: Firebase Auth could not be initialized.');
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    setError(null);
    setLoading(true);
    let step = 'firebase_create';
    // Set when the Firebase user survives a failed backend call, so the error
    // can tell the person that signing in will finish the job.
    let firebaseUserKept = false;
    try {
      if (__DEV__) {
        console.log('[Register] API base URL:', API_CONFIG.baseUrl);
        console.log('[Register] Step: Creating user in Firebase...');
      }
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, emailTrimmed, password);
      step = 'firebase_profile';
      await updateProfile(userCredential.user, {
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim() || emailTrimmed,
      });
      // Refresh so the token carries the display name just set.
      step = 'firebase_token';
      const firebaseIdToken = await userCredential.user.getIdToken(true);
      const deviceId = Constants.installationId ?? Constants.sessionId ?? 'mobile';
      if (__DEV__) {
        console.log('[Register] Firebase user created. Calling backend signup...');
      }

      // The backend row is what makes this a payroll account; a Firebase user on
      // its own is nothing. So the backend goes first, and a definite rejection
      // (4xx: bad token, validation) removes the Firebase user again — otherwise
      // the email stays "already in use" with no account behind it.
      // On a transport failure or a 5xx the backend may have written the row
      // already, and deleting the Firebase user then would strand it: the
      // sign-in path creates the backend row if it is missing, so the Firebase
      // user is kept and the person is told to sign in.
      step = 'backend_signup';
      try {
        await authService.firebaseSignUp(firebaseIdToken, deviceId);
      } catch (backendErr) {
        const status = responseStatus(backendErr);
        if (status !== undefined && status >= 400 && status < 500) {
          await deleteUser(userCredential.user).catch(() => {});
        } else {
          firebaseUserKept = true;
        }
        throw backendErr;
      }
      if (__DEV__) console.log('[Register] Backend signup succeeded.');

      // Only now is there an account worth verifying. The next screen has a
      // resend button, so a mail that fails to go out must not undo the signup.
      step = 'firebase_verification_email';
      await sendEmailVerification(userCredential.user).catch((mailErr: unknown) => {
        if (__DEV__) console.warn('[Register] Verification email not sent:', mailErr);
      });
      navigation.navigate('EmailVerification');
    } catch (err: any) {
      let msg = describeAuthError(err, 'Something went wrong. Please try again.');
      if (firebaseUserKept) {
        msg += ' Your account was created but not finished. Try signing in with the email and password you just entered.';
      }
      if (__DEV__) {
        console.error('[Register] Failed at step:', step, '| Error:', err?.message ?? err);
        // response is undefined when the request never reached the server
        // (e.g. Network Error = wrong URL / unreachable)
        console.error('[Register] Response:', err?.response?.data ?? '(no response – check API base URL and backend reachable)');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (name: FieldName) => [styles.field, focused === name && styles.fieldFocused];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={['Grow', 'Together']} scriptTop={92} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand */}
            <View style={styles.brand}>
              <LinearGradient
                colors={[C.blueLight, C.blueDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoTile}
              >
                <MaterialCommunityIcons name="account-plus" size={30} color="#FFFFFF" />
              </LinearGradient>

              <View style={styles.brandText}>
                <Text style={styles.wordmark}>
                  <Text style={styles.wordmarkAccent}>Ai</Text>Payroll
                </Text>
                <Text style={styles.wordmarkSub}>HRMS</Text>
              </View>
            </View>

            <Text style={styles.pitch}>People  ·  Payroll  ·  A Brighter Tomorrow</Text>

            <Text style={styles.pageTitle}>Create Account</Text>
            <Text style={styles.pageSubtitle}>Join AiPayroll HRMS and get started today.</Text>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Get Started</Text>
              <Text style={styles.cardSubtitle}>Fill in the details to create your account</Text>

              {error !== null && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={17} color={C.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={field('firstName')}>
                <MaterialCommunityIcons name="account-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor={C.muted}
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFocused('firstName')}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              <View style={field('lastName')}>
                <MaterialCommunityIcons name="account-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor={C.muted}
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocused('lastName')}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              <View style={field('email')}>
                <MaterialCommunityIcons name="email-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={C.muted}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>

              <View style={field('password')}>
                <MaterialCommunityIcons name="lock-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={C.muted}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="new-password"
                  editable={!loading}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={C.muted}
                  />
                </TouchableOpacity>
              </View>

              <View style={field('confirmPassword')}>
                <MaterialCommunityIcons name="lock-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={C.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocused('confirmPassword')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="new-password"
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={C.muted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={styles.submitShadow}
              >
                <LinearGradient
                  colors={loading ? ['#9DBEFB', '#9DBEFB'] : [C.blueDeep, C.blueLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submit}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Create Account</Text>
                      <MaterialCommunityIcons name="arrow-right" size={19} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.secondary}
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryText}>
                  Already have an account? <Text style={styles.secondaryLink}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F6FE' },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 26 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  logoTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.blueDeep,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  brandText: { justifyContent: 'center' },
  wordmark: { fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  wordmarkAccent: { color: C.blue },
  wordmarkSub: { marginTop: 1, fontSize: 14, color: C.body },
  pitch: { marginTop: 14, fontSize: 12.5, color: C.muted },

  pageTitle: { marginTop: 20, fontSize: 30, fontWeight: '800', color: C.ink, letterSpacing: -0.6 },
  pageSubtitle: { marginTop: 5, marginBottom: 20, fontSize: 14, color: C.body },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#1D3B72',
    shadowOpacity: 0.09,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  cardSubtitle: { marginTop: 4, marginBottom: 18, fontSize: 13, color: C.muted },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: C.danger },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 52,
    borderRadius: 13,
    paddingHorizontal: 15,
    marginBottom: 12,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },

  submitShadow: {
    marginTop: 6,
    borderRadius: 14,
    shadowColor: C.blueDeep,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 55,
    borderRadius: 14,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  dividerText: { fontSize: 11.5, fontWeight: '600', color: C.muted, letterSpacing: 0.6 },

  secondary: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  secondaryText: { fontSize: 13.5, color: C.body },
  secondaryLink: { fontWeight: '700', color: C.blue },
});

export default RegisterScreen;
