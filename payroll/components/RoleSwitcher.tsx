/**
 * Role Switcher Component
 * Allows users to switch between Employee and Manager roles
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { USER_ROLES } from '../constants/userRoles';

export const RoleSwitcher: React.FC = () => {
  const { currentRole, availableRoles, switchRole } = usePayrollAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Don't show if user doesn't have multiple roles
  if (!availableRoles || availableRoles.length <= 1) {
    return null;
  }

  const getRoleIcon = (role: string): string => {
    return role === USER_ROLES.MANAGER ? 'shield-account' : 'account';
  };

  const getRoleColor = (role: string): string => {
    return role === USER_ROLES.MANAGER ? '#FF5722' : '#4285F4';
  };

  const handleSwitchRole = async (newRole: string) => {
    if (newRole === currentRole) {
      setModalVisible(false);
      return;
    }

    setSwitching(true);
    try {
      await switchRole(newRole);
      setModalVisible(false);
      Alert.alert('Success', `Switched to ${newRole} role`);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch role. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { borderColor: getRoleColor(currentRole || '') }]}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons
          name={getRoleIcon(currentRole || '')}
          size={20}
          color={getRoleColor(currentRole || '')}
        />
        <Text style={[styles.roleText, { color: getRoleColor(currentRole || '') }]}>
          {currentRole}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Role</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.roleList}>
              {availableRoles.map((role) => {
                const isActive = role === currentRole;
                const color = getRoleColor(role);

                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleItem,
                      isActive && { backgroundColor: `${color}10` },
                    ]}
                    onPress={() => handleSwitchRole(role)}
                    disabled={switching}
                  >
                    <View style={styles.roleItemLeft}>
                      <View
                        style={[styles.roleIconContainer, { backgroundColor: `${color}20` }]}
                      >
                        <MaterialCommunityIcons
                          name={getRoleIcon(role)}
                          size={24}
                          color={color}
                        />
                      </View>
                      <View>
                        <Text style={[styles.roleItemTitle, isActive && { color }]}>
                          {role}
                        </Text>
                        <Text style={styles.roleItemSubtitle}>
                          {role === USER_ROLES.MANAGER
                            ? 'Approve requests, view all data'
                            : 'Submit requests, view own data'}
                        </Text>
                      </View>
                    </View>
                    {isActive && (
                      <View style={[styles.activeIndicator, { backgroundColor: color }]}>
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  roleList: {
    padding: 16,
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  roleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  roleItemSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  activeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
