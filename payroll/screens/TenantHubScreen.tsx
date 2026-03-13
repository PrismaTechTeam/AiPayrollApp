/**
 * Tenant Hub Screen
 * Shows all joined tenants and pending join requests.
 * User selects a tenant to enter PayrollHome, or joins a new tenant.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import companyService, { JoinRequest } from '../api/services/companyService';

interface TenantHubScreenProps {
  navigation?: any;
}

export const TenantHubScreen: React.FC<TenantHubScreenProps> = ({ navigation }) => {
  const { user, logout, switchCompany, refreshTenants } = usePayrollAuth();
  const [activeTab, setActiveTab] = useState<'tenants' | 'pending'>('tenants');
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [switchingTenantId, setSwitchingTenantId] = useState<string | null>(null);

  const tenants = user?.availableTenants ?? [];
  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'User';

  // Load all joined tenants and pending requests when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshTenants();
      fetchPendingRequests();
    }, [refreshTenants])
  );

  const fetchPendingRequests = async () => {
    setLoadingPending(true);
    try {
      const requests = await companyService.getJoinRequests();
      setPendingRequests(requests.filter(r => r.status === 'PENDING'));
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSelectTenant = async (tenantId: string, tenantName: string) => {
    setSwitchingTenantId(tenantId);
    try {
      await switchCompany(tenantId);
      navigation?.navigate('PayrollHome');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to switch tenant');
    } finally {
      setSwitchingTenantId(null);
    }
  };

  const handleJoinTenant = () => {
    navigation?.navigate('JoinTenant');
  };

  const handleCancelRequest = async (request: JoinRequest) => {
    Alert.alert(
      'Cancel Request',
      `Cancel your request to join ${request.tenantName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await companyService.cancelJoinRequest(request.id);
              fetchPendingRequests();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const pendingCount = pendingRequests.length;

  const renderTenantCard = ({ item }: { item: typeof tenants[0] }) => {
    const isCurrent = item.id === user?.tenantId;
    const isSwitching = switchingTenantId === item.id;

    return (
      <TouchableOpacity
        style={[styles.tenantCard, isCurrent && styles.tenantCardActive]}
        onPress={() => handleSelectTenant(item.id, item.name)}
        disabled={isSwitching}
        activeOpacity={0.7}
      >
        <View style={[styles.tenantIcon, isCurrent && styles.tenantIconActive]}>
          <Text style={styles.tenantIconText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.tenantInfo}>
          <Text style={[styles.tenantName, isCurrent && styles.tenantNameActive]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.tenantRole}>
            {item.role || 'Employee'}
          </Text>
        </View>
        {isSwitching ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : isCurrent ? (
          <View style={styles.currentBadge}>
            <MaterialCommunityIcons name="check" size={14} color="#FFF" />
          </View>
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
        )}
      </TouchableOpacity>
    );
  };

  const renderPendingCard = ({ item }: { item: JoinRequest }) => {
    return (
      <View style={styles.pendingCard}>
        <View style={styles.pendingIcon}>
          <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
        </View>
        <View style={styles.pendingInfo}>
          <Text style={styles.pendingName} numberOfLines={1}>{item.tenantName}</Text>
          <Text style={styles.pendingStatus}>Waiting for HR approval</Text>
          <Text style={styles.pendingDate}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelRequest(item)}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={22} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>My Tenants</Text>
              <Text style={styles.headerSubtitle}>Hi, {firstName}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.addButton} onPress={handleJoinTenant}>
                <MaterialCommunityIcons name="plus" size={24} color="#4285F4" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutHeaderButton} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.contentContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tenants' && styles.tabActive]}
              onPress={() => setActiveTab('tenants')}
            >
              <Text style={[styles.tabText, activeTab === 'tenants' && styles.tabTextActive]}>
                Joined Tenants
              </Text>
              {tenants.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'tenants' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'tenants' && styles.tabBadgeTextActive]}>
                    {tenants.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                Pending Approvals
              </Text>
              {pendingCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: '#FF9800' }]}>
                  <Text style={[styles.tabBadgeText, { color: '#FFF' }]}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'tenants' ? (
            tenants.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="office-building-outline" size={64} color="#CCC" />
                <Text style={styles.emptyTitle}>No Tenants Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Join a tenant to access payroll features
                </Text>
                <TouchableOpacity style={styles.emptyJoinButton} onPress={handleJoinTenant}>
                  <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                  <Text style={styles.emptyJoinText}>Join a Tenant</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={tenants}
                keyExtractor={(item) => item.id}
                renderItem={renderTenantCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )
          ) : (
            loadingPending ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#4285F4" />
              </View>
            ) : pendingRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="check-circle-outline" size={64} color="#CCC" />
                <Text style={styles.emptyTitle}>No Pending Requests</Text>
                <Text style={styles.emptySubtitle}>
                  All your join requests have been processed
                </Text>
              </View>
            ) : (
              <FlatList
                data={pendingRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderPendingCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#4285F4',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 20,
  },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tenantCardActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#4285F4',
  },
  tenantIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tenantIconActive: {
    backgroundColor: '#1A73E8',
  },
  tenantIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 3,
  },
  tenantNameActive: {
    color: '#1A73E8',
  },
  tenantRole: {
    fontSize: 13,
    color: '#888',
  },
  currentBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  pendingStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 2,
  },
  pendingDate: {
    fontSize: 11,
    color: '#999',
  },
  cancelButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyJoinText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default TenantHubScreen;
