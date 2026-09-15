/**
 * Login Screen
 * Firebase-based authentication with email/password.
 *
 * Visual language (2026-09-07 redesign): a light, airy page rather than the old
 * solid-blue header. The brand block is left-aligned at the top over a soft
 * gradient with decorative shapes, and the form sits in one floating white card.
 * Errors render inline in the card instead of a native Alert — a system dialog
 * on top of this layout reads as a crash, and it covers the field it refers to.
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
import { usePayrollAuth, setKeepSignedIn } from '../context/PayrollAuthContext';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { describeAuthError } from '../lib/firebaseErrors';


export const LoginScreen: React.FC = () => {
  const { login } = usePayrollAuth();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeep] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email address and password to sign in.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // Recorded before the call so the choice survives even if the app is
      // killed straight after a successful sign-in.
      await setKeepSignedIn(keepSignedIn);
      await login(email.trim(), password);
    } catch (err) {
      setError(describeAuthError(err, 'We could not sign you in. Check your details and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={['People', 'Power', 'Progress']} showIdCard />

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
                <MaterialCommunityIcons name="briefcase-account" size={34} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.wordmark}>
                Payroll <Text style={styles.wordmarkAccent}>App</Text>
              </Text>
              <Text style={styles.tagline}>Employee Management System</Text>
              <Text style={styles.pitch}>
                Simpler People Management{'\n'}for a Brighter Tomorrow
              </Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.welcome}>Welcome Back!</Text>
              <Text style={styles.welcomeSub}>Sign in to continue to Payroll App</Text>

              {error !== null && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={17} color={C.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={[styles.field, focused === 'email' && styles.fieldFocused]}>
                <MaterialCommunityIcons name="email-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
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

              <View style={[styles.field, focused === 'password' && styles.fieldFocused]}>
                <MaterialCommunityIcons name="lock-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={C.muted}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="password"
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
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

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.keepRow}
                  onPress={() => setKeep(v => !v)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: keepSignedIn }}
                  accessibilityLabel="Keep me signed in"
                >
                  <View style={[styles.checkbox, keepSignedIn && styles.checkboxOn]}>
                    {keepSignedIn && (
                      <MaterialCommunityIcons name="check-bold" size={13} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.keepLabel}>Keep me signed in</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={loading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.link}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
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
                      <Text style={styles.submitText}>Sign In</Text>
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
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryText}>
                  Don&apos;t have an account?{' '}
                  <Text style={styles.secondaryLink}>Create Account</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>
              © {new Date().getFullYear()} Payroll App. All rights reserved.
            </Text>
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 26 },

  // Backdrop

  // Brand
  brand: { marginTop: 18, marginBottom: 26 },
  logoTile: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.blueDeep,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  wordmark: { marginTop: 18, fontSize: 33, fontWeight: '800', color: C.ink, letterSpacing: -0.6 },
  wordmarkAccent: { color: C.blue },
  tagline: { marginTop: 4, fontSize: 15, color: C.body },
  pitch: { marginTop: 14, fontSize: 13, lineHeight: 19, color: C.muted },

  // Card
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
  welcome: { fontSize: 25, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  welcomeSub: { marginTop: 5, marginBottom: 20, fontSize: 13.5, color: C.body },

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
    height: 54,
    borderRadius: 13,
    paddingHorizontal: 15,
    marginBottom: 13,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },

  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    marginBottom: 20,
  },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: { backgroundColor: C.blue, borderColor: C.blue },
  keepLabel: { fontSize: 13, color: C.body },
  link: { fontSize: 13, fontWeight: '600', color: C.blue },

  submitShadow: {
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

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  dividerText: { fontSize: 11.5, fontWeight: '600', color: C.muted, letterSpacing: 0.6 },

  secondary: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
  },
  secondaryText: { fontSize: 13.5, color: C.body },
  secondaryLink: { fontWeight: '700', color: C.blue },

  footer: { marginTop: 22, textAlign: 'center', fontSize: 11.5, color: C.muted },
});

export default LoginScreen;
