/**
 * Side Menu Component
 * Hamburger menu with role switcher and navigation options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RoleSwitcher } from './RoleSwitcher';
import { usePayrollAuth } from '../context/PayrollAuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation?: any;
}

export const SideMenu: React.FC<SideMenuProps> = ({ visible, onClose, navigation }) => {
  const { user, logout, availableRoles } = usePayrollAuth();
  const hasMultipleRoles = availableRoles && availableRoles.length > 1;

  const handleLogout = () => {
    onClose();
    logout();
  };

  const handleProfile = () => {
    onClose();
    navigation?.navigate('Profile');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Menu Content */}
        <SafeAreaView style={styles.menuContainer} edges={['top', 'bottom']}>
          <View style={styles.menu}>
            {/* Header */}
            <View style={styles.menuHeader}>
              <View style={styles.userSection}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user?.name || 'User'}</Text>
                  <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Role Switcher Section — only when user has multiple roles */}
            {hasMultipleRoles && (
              <>
                <View style={styles.roleSwitcherSection}>
                  <Text style={styles.sectionTitle}>Switch Role</Text>
                  <RoleSwitcher />
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {/* Tenant Hub — always first */}
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                onClose();
                navigation?.navigate('TenantHub');
              }}>
                <MaterialCommunityIcons name="office-building" size={24} color="#4285F4" />
                <Text style={styles.menuItemText}>Tenant Hub</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleProfile}>
                <MaterialCommunityIcons name="account" size={24} color="#666" />
                <Text style={styles.menuItemText}>Profile</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => {
                onClose();
                navigation?.navigate('Settings');
              }}>
                <MaterialCommunityIcons name="cog" size={24} color="#666" />
                <Text style={styles.menuItemText}>Settings</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => {
                onClose();
                navigation?.navigate('Help');
              }}>
                <MaterialCommunityIcons name="help-circle" size={24} color="#666" />
                <Text style={styles.menuItemText}>Help & Support</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  navigation.navigate('About' as never);
                }}
              >
                <MaterialCommunityIcons name="information" size={24} color="#666" />
                <Text style={styles.menuItemText}>About</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color="#FF5252" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* Version */}
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    width: MENU_WIDTH,
    backgroundColor: '#FFFFFF',
  },
  menu: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
  },
  roleSwitcherSection: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5252',
    marginLeft: 16,
  },
  version: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    padding: 20,
    marginTop: 'auto',
  },
});

export default SideMenu;
