/**
 * Email Verification Screen
 * Shown after registration to prompt user to verify their email (Phase 3)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { sendEmailVerification } from 'firebase/auth';
import authService from '../api/services/authService';
import { getFirebaseAuth } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';

export const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [resending, setResending] = useState(false);

  const handleOpenEmailApp = async () => {
    try {
      await Linking.openURL('mailto:');
    } catch {
      Alert.alert('Error', 'Unable to open email app.');
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const firebaseAuth = getFirebaseAuth();
      const currentUser = firebaseAuth?.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
      } else {
        await authService.resendVerificationEmail();
        Alert.alert('Email Sent', 'A new verification link has been sent to your email.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleBackToSignIn = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Verify Email</Text>
        </View>

        {/* Content */}
        <View style={[styles.contentContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
            <MaterialCommunityIcons name="email-check-outline" size={100} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Check Your Email</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            We've sent a verification link to your email. Please verify your email address to
            continue.
          </Text>

          {/* Open Email App Button */}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleOpenEmailApp}>
            <MaterialCommunityIcons name="email-open-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Open Email App</Text>
          </TouchableOpacity>

          {/* Resend Email Link */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleResendEmail}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.linkButtonText, { color: colors.primary }]}>Resend Email</Text>
            )}
          </TouchableOpacity>

          {/* Back to Sign In Link */}
          <TouchableOpacity style={styles.linkButton} onPress={handleBackToSignIn}>
            <Text style={[styles.backToSignInText, { color: colors.textSecondary }]}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 32,
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  linkButton: {
    marginTop: 20,
    padding: 8,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backToSignInText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default EmailVerificationScreen;
