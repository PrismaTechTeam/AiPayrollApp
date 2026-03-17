/**
 * Settings Screen
 * User settings and preferences
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { useTheme } from '../context/ThemeContext';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, logout } = usePayrollAuth();

  // More Options toggles
  const [newsletter, setNewsletter] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.navigate('Login' as never);
          },
        },
      ]
    );
  };

  const handleMenuPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleMenuPress}>
            <MaterialCommunityIcons name="menu" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileRole}>Basic Member</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Accounts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts</Text>
          </View>

          <View style={styles.menuList}>
            <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
              <MaterialCommunityIcons name="lock" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>Change Password</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
              <MaterialCommunityIcons name="cog" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>Document Management</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* More Options Section */}
        <View style={styles.section}>
          <Text style={styles.moreOptionsTitle}>More Options</Text>

          <View style={styles.menuList}>
            {/* Newsletter Toggle */}
            <View style={styles.menuItem}>
              <MaterialCommunityIcons name="email-newsletter" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>Newsletter</Text>
              <Switch
                value={newsletter}
                onValueChange={setNewsletter}
                trackColor={{ false: '#E0E0E0', true: '#4285F4' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Theme */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Theme' as never)}
            >
              <MaterialCommunityIcons name="palette-outline" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>Theme</Text>
              <Text style={styles.menuItemValue}>Light</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Language */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Language' as never)}
            >
              <MaterialCommunityIcons name="translate" size={24} color={colors.text} />
              <Text style={styles.menuItemText}>Language</Text>
              <Text style={styles.menuItemValue}>English</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeAreaTop: {
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreOptionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primaryLight + '30',
  },
  menuList: {
    backgroundColor: colors.surface,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
  },
  menuItemValue: {
    fontSize: 14,
    color: colors.textTertiary,
    marginRight: 8,
  },
});

export default SettingsScreen;
