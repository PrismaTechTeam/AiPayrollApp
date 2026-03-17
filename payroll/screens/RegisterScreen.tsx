/**
 * Register Screen
 * Creates account in Firebase first, then syncs to backend (so login works).
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
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import Constants from 'expo-constants';
import authService from '../api/services/authService';
import { API_CONFIG } from '../api/config';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
    if (!isFirebaseConfigured()) {
      Alert.alert(
        'Registration Unavailable',
        'Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to AiPayrollApp/.env (see FIREBASE_SETUP.md).'
      );
      return;
    }
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      Alert.alert('Registration Unavailable', 'Firebase Auth could not be initialized.');
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    setLoading(true);
    let step = 'firebase_create';
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
      // Send verification email via Firebase (user receives link from Firebase)
      step = 'firebase_verification_email';
      await sendEmailVerification(userCredential.user);
      step = 'firebase_token';
      const firebaseIdToken = await userCredential.user.getIdToken(true);
      const deviceId = Constants.installationId ?? Constants.sessionId ?? 'mobile';
      if (__DEV__) {
        console.log('[Register] Firebase user created. Calling backend signup...');
      }
      step = 'backend_signup';
      await authService.firebaseSignUp(firebaseIdToken, deviceId);
      if (__DEV__) console.log('[Register] Backend signup succeeded.');
      navigation.navigate('EmailVerification' as never);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.errors?.[0] ??
        err?.message ??
        'Something went wrong. Please try again.';
      if (__DEV__) {
        console.error('[Register] Failed at step:', step, '| Error:', err?.message ?? err);
        // response is undefined when request never reached the server (e.g. Network Error = wrong URL / unreachable)
        console.error('[Register] Response:', err?.response?.data ?? '(no response – check API base URL and backend reachable)');
      }
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="account-plus" size={64} color="#FFFFFF" />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join AiPayroll HRMS</Text>
          </View>

          {/* Registration Form */}
          <ScrollView
            style={[styles.formContainer, { backgroundColor: colors.surface }]}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.welcomeText, { color: colors.text }]}>Get Started</Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>Fill in the details to create your account</Text>

            {/* First Name Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="First Name"
                placeholderTextColor={colors.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
              />
            </View>

            {/* Last Name Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Last Name"
                placeholderTextColor={colors.textTertiary}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
              />
            </View>

            {/* Email Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={colors.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <MaterialCommunityIcons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, { backgroundColor: colors.primary }, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={[styles.signInText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={[styles.signInLink, { color: colors.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 6,
  },
  formContainer: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  formContent: {
    padding: 24,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  registerButton: {
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signInText: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RegisterScreen;
