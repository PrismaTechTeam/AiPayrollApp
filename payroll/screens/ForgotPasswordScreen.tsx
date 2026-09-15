/**
 * Forgot Password Screen
 * Requests a password reset email via backend (Firebase reset link).
 *
 * Visual language matches LoginScreen and RegisterScreen — this screen is one tap
 * from the sign-in form, so it shares AuthBackdrop, the same palette and the same
 * single floating card. The old saturated blue header made it read as a different
 * app the moment "Forgot Password?" was tapped.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import authService from '../api/services/authService';
import { useDialog } from '../components/ui/AppDialog';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      void dialog.notify({ title: 'Email required', message: 'Please enter your email address.', tone: 'warning' });
      return;
    }
    if (!isValidEmail(trimmed)) {
      void dialog.notify({ title: 'Check the email', message: 'Please enter a valid email address.', tone: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(trimmed);
      await dialog.notify({
        title: 'Check your email',
        message: "If an account exists for that email, we've sent a password reset link. Please check your inbox and follow the instructions.",
        tone: 'success',
      });
      navigation.goBack();
    } catch (err: unknown) {
      // Backend returns success even for unknown emails (security), so this is usually network/config
      const message = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : 'Unable to send reset email. Please try again.';
      await dialog.notify({ title: 'Request failed', message, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

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
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={[C.blueLight, C.blueDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoTile}
              >
                <MaterialCommunityIcons name="lock-reset" size={32} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.instructionText}>
                We&apos;ll send you an email with a link to reset your password.
              </Text>

              <Text style={styles.fieldLabel}>Email address</Text>
              <View style={[styles.field, focused && styles.fieldFocused]}>
                <MaterialCommunityIcons name="email-outline" size={19} color={C.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="you@company.com"
                  placeholderTextColor={C.muted}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <View style={styles.actionGap} />

              <PrimaryButton
                label="Send reset link"
                icon="send-outline"
                onPress={handleSubmit}
                loading={loading}
              />

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
                disabled={loading}
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
              The link expires shortly after it is sent. Request a new one if it has.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 30 },

  // Header
  header: { marginTop: 22, marginBottom: 26 },
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
  title: { marginTop: 18, fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 14.5, lineHeight: 20, color: C.body },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  instructionText: { fontSize: 13.5, lineHeight: 20, color: C.body, marginBottom: 18 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.body,
    letterSpacing: 0.3,
    marginBottom: 6,
    marginLeft: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 15,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },

  actionGap: { height: 20 },

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

export default ForgotPasswordScreen;
