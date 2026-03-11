/**
 * User Home Screen
 * Shown when user is authenticated but has not joined any tenant yet.
 * Acts as a proper home page with greeting and join tenant action.
 */

import React, { useState } from 'react';
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

export const UserHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = usePayrollAuth();

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'User';
  const initials = firstName.charAt(0).toUpperCase() +
    (user?.lastName ? user.lastName.charAt(0).toUpperCase() : '');

  const handleJoinTenant = () => {
    navigation.navigate('JoinTenant' as never);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />

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

          {/* Greeting & Avatar */}
          <Text style={styles.greetingText}>Hi, {firstName}!</Text>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* No Tenant Card */}
          <View style={styles.card}>
            <MaterialCommunityIcons
              name="office-building-outline"
              size={72}
              color="#B0B0B0"
            />
            <Text style={styles.cardTitle}>No Tenant Joined</Text>
            <Text style={styles.cardSubtitle}>
              You haven't joined any company/tenant yet.
            </Text>

            {/* Join Button */}
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinTenant}>
              <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.joinHint}>Tap + to join a tenant</Text>
          </View>

          {/* Bottom Helper Text */}
          <View style={styles.helperContainer}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#999" />
            <Text style={styles.helperText}>
              Contact your HR if you need an invitation code or QR
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
    backgroundColor: '#4285F4',
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
  greetingText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  joinButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  joinHint: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: '#999999',
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default UserHomeScreen;
