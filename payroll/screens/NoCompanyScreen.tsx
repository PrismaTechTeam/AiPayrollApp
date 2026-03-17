/**
 * No Company Screen
 * Shown when user is authenticated but has no tenant/company assigned (Phase 4)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useTheme } from '../context/ThemeContext';

export const NoCompanyScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, logout } = usePayrollAuth();

  const handleJoinCompany = () => {
    navigation.navigate('JoinCompany' as never);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>AiPayroll</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <MaterialCommunityIcons name="office-building" size={64} color="#FFFFFF" />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.subtitleText}>
            You're not connected to any company yet.
          </Text>

          {/* User Info Card */}
          {user && (
            <View style={styles.userInfoCard}>
              <View style={styles.userAvatar}>
                <MaterialCommunityIcons name="account-circle" size={48} color={colors.primary} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
          )}

          {/* Join Company Button */}
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinCompany}>
            <MaterialCommunityIcons name="domain-plus" size={22} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Join a Company</Text>
          </TouchableOpacity>

          {/* Helper Text */}
          <View style={styles.helperContainer}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.textTertiary} />
            <Text style={styles.helperText}>
              Your company admin may need to invite you. Contact your HR department if you're
              unsure.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  userAvatar: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    paddingHorizontal: 8,
    gap: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: colors.textTertiary,
    lineHeight: 20,
  },
});

export default NoCompanyScreen;
