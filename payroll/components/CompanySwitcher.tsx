/**
 * Company Switcher Component
 * Allows users to switch between different companies
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePayrollAuth } from '../context/PayrollAuthContext';

export const CompanySwitcher: React.FC = () => {
  const { currentCompany, availableCompanies, switchCompany } = usePayrollAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Don't show if user doesn't have multiple companies
  if (!availableCompanies || availableCompanies.length <= 1) {
    return null;
  }

  const getCompanyInitials = (company: string): string => {
    return company
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSwitchCompany = async (newCompany: string) => {
    if (newCompany === currentCompany) {
      setModalVisible(false);
      return;
    }

    setSwitching(true);
    try {
      await switchCompany(newCompany);
      setModalVisible(false);
      Alert.alert('Success', `Switched to ${newCompany}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch company. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>
            {currentCompany ? getCompanyInitials(currentCompany) : 'CO'}
          </Text>
        </View>
        <Text style={styles.companyText} numberOfLines={1}>
          {currentCompany || 'Company'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color="#FFFFFF" />
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
              <Text style={styles.modalTitle}>Switch Company</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.companyList}>
              {availableCompanies.map((company) => {
                const isActive = company === currentCompany;

                return (
                  <TouchableOpacity
                    key={company}
                    style={[
                      styles.companyItem,
                      isActive && styles.companyItemActive,
                    ]}
                    onPress={() => handleSwitchCompany(company)}
                    disabled={switching}
                  >
                    <View style={styles.companyItemLeft}>
                      <View style={styles.companyIconContainer}>
                        <Text style={styles.companyIconText}>
                          {getCompanyInitials(company)}
                        </Text>
                      </View>
                      <View>
                        <Text style={[
                          styles.companyItemTitle,
                          isActive && styles.companyItemTitleActive,
                        ]}>
                          {company}
                        </Text>
                        <Text style={styles.companyItemSubtitle}>
                          {isActive ? 'Current company' : 'Tap to switch'}
                        </Text>
                      </View>
                    </View>
                    {isActive && (
                      <View style={styles.activeIndicator}>
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 80,
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
  companyList: {
    padding: 16,
  },
  companyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
  },
  companyItemActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#4285F4',
  },
  companyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  companyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companyItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  companyItemTitleActive: {
    color: '#4285F4',
  },
  companyItemSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  activeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
