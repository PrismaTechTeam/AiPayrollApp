/**
 * Profile Screen
 * Loads profile data from API and provides navigation to settings.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useTheme } from '../context/ThemeContext';
import { BottomNavBar } from '../components/BottomNavBar';
import profileService from '../api/services/profileService';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, currentRole, logout } = usePayrollAuth();
  const { colors } = useTheme();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileService.getProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  const getRoleColor = (role: string) => {
    const lower = role.toLowerCase();
    return (lower.includes('admin') || lower.includes('owner') || lower.includes('hr'))
      ? colors.error : colors.primary;
  };
  const getRoleIcon = (role: string) => {
    const lower = role.toLowerCase();
    return (lower.includes('admin') || lower.includes('owner') || lower.includes('hr'))
      ? 'shield-account' : 'account';
  };

  const emp = (profileData as any)?.employee;
  const displayName = emp?.fullName || user?.name || 'User';
  const displayEmail = emp?.email || user?.email || '';
  const department = emp?.department || null;
  const employeeCode = emp?.employeeCode || null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.primary} />

      <SafeAreaView style={[styles.safeAreaTop, { backgroundColor: colors.primary }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: 40 }} />
          ) : (
            <>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: getRoleColor(currentRole || '') }]}>
                  <MaterialCommunityIcons
                    name={getRoleIcon(currentRole || '') as any}
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{displayEmail}</Text>

              {employeeCode && (
                <Text style={[styles.employeeCode, { color: colors.textTertiary }]}>{employeeCode}</Text>
              )}

              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(currentRole || '') + '20' }]}>
                  <MaterialCommunityIcons
                    name={getRoleIcon(currentRole || '') as any}
                    size={16}
                    color={getRoleColor(currentRole || '')}
                  />
                  <Text style={[styles.roleText, { color: getRoleColor(currentRole || '') }]}>
                    {currentRole}
                  </Text>
                </View>
                {department && (
                  <View style={[styles.deptBadge, { backgroundColor: colors.background }]}>
                    <MaterialCommunityIcons name="office-building-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.deptText, { color: colors.textSecondary }]}>{department}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Account Settings */}
        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Account Settings</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('EditProfile' as never)}>
            <MaterialCommunityIcons name="account-edit" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Profile</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('ChangePassword' as never)}>
            <MaterialCommunityIcons name="lock-outline" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Change Password</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('Notifications' as never)}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Notifications</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Preferences</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('Theme' as never)}>
            <MaterialCommunityIcons name="theme-light-dark" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Theme</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('Language' as never)}>
            <MaterialCommunityIcons name="translate" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Language</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.menuSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>About</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('About' as never)}>
            <MaterialCommunityIcons name="information-outline" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>About App</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Privacy Policy</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]} onPress={() => navigation.navigate('Help' as never)}>
            <MaterialCommunityIcons name="help-circle-outline" size={24} color={colors.icon} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>Help & Support</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.surface }]} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavBar activeScreen="profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeAreaTop: {},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  content: { flex: 1 },
  profileCard: { alignItems: 'center', paddingVertical: 32, marginBottom: 16 },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 14, marginBottom: 4 },
  employeeCode: { fontSize: 12, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 20, gap: 6,
  },
  roleText: { fontSize: 14, fontWeight: '700' },
  deptBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 16, gap: 4,
  },
  deptText: { fontSize: 12 },
  menuSection: { marginBottom: 16, paddingVertical: 8 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', paddingHorizontal: 20,
    paddingVertical: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 16, borderBottomWidth: 1,
  },
  menuItemText: { flex: 1, fontSize: 16, marginLeft: 16 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginTop: 8,
    paddingVertical: 16, borderRadius: 12, gap: 12,
  },
  logoutText: { fontSize: 16, fontWeight: '700' },
});

export default ProfileScreen;
