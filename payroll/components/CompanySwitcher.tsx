/**
 * Company Switcher Component
 * Allows users to switch between different companies
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';

export const CompanySwitcher: React.FC = () => {
  const { currentCompany, availableCompanies, switchCompany, user } = usePayrollAuth();
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Always show if user has at least one company
  if (!currentCompany) {
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

  const tenants = user?.availableTenants ?? [];
  const hasMultipleTenants = tenants.length > 1;

  const handleSwitchCompany = async (tenantId: string, tenantName: string) => {
    if (tenantName === currentCompany) {
      setModalVisible(false);
      return;
    }

    setSwitching(true);
    try {
      await switchCompany(tenantId);
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to switch company. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const handleGoToTenantHub = () => {
    setModalVisible(false);
    navigation.navigate('TenantHub' as never);
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
              <Text style={styles.modalTitle}>Current Tenant</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.companyList}>
              {/* Show tenant list for switching if multiple */}
              {hasMultipleTenants ? (
                tenants.map((tenant) => {
                  const isActive = tenant.name === currentCompany;
                  return (
                    <TouchableOpacity
                      key={tenant.id}
                      style={[
                        styles.companyItem,
                        isActive && styles.companyItemActive,
                      ]}
                      onPress={() => handleSwitchCompany(tenant.id, tenant.name)}
                      disabled={switching}
                    >
                      <View style={styles.companyItemLeft}>
                        <View style={styles.companyIconContainer}>
                          <Text style={styles.companyIconText}>
                            {getCompanyInitials(tenant.name)}
                          </Text>
                        </View>
                        <View>
                          <Text style={[
                            styles.companyItemTitle,
                            isActive && styles.companyItemTitleActive,
                          ]}>
                            {tenant.name}
                          </Text>
                          <Text style={styles.companyItemSubtitle}>
                            {isActive ? 'Current tenant' : 'Tap to switch'}
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
                })
              ) : (
                <View style={[styles.companyItem, styles.companyItemActive]}>
                  <View style={styles.companyItemLeft}>
                    <View style={styles.companyIconContainer}>
                      <Text style={styles.companyIconText}>
                        {getCompanyInitials(currentCompany)}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.companyItemTitle, styles.companyItemTitleActive]}>
                        {currentCompany}
                      </Text>
                      <Text style={styles.companyItemSubtitle}>Current tenant</Text>
                    </View>
                  </View>
                  <View style={styles.activeIndicator}>
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  </View>
                </View>
              )}

              {/* Go to Tenant Hub */}
              <TouchableOpacity
                style={styles.tenantHubButton}
                onPress={handleGoToTenantHub}
              >
                <MaterialCommunityIcons name="office-building" size={20} color="#4285F4" />
                <Text style={styles.tenantHubText}>Go to Tenant Hub</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#4285F4" />
              </TouchableOpacity>
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
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
  tenantHubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
    marginTop: 4,
    gap: 8,
  },
  tenantHubText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
});
