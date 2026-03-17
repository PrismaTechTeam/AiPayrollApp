/**
 * My Requests Screen (Employee View)
 * Display employee's own submitted requests with status filtering and cancel action
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Header } from '../components/requests';
import { BottomNavBar } from '../components/BottomNavBar';
import requestService, { EmployeeRequest } from '../api/services/requestService';
import { STATUSES, STATUS_COLORS } from '../constants/statuses';

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const getStatusColor = (status: string) => {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  return colors?.text || '#9E9E9E';
};

const getStatusBg = (status: string) => {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  return colors?.bg || '#F5F5F5';
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const MyRequestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL');
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const status = activeTab === 'ALL' ? undefined : activeTab;
      const result = await requestService.getApplications({ pageSize: 100, status });
      setRequests(result.items);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      Alert.alert('Error', 'Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests =
    activeTab === 'ALL'
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const handleCancel = (requestId: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await requestService.cancelApplication(requestId);
            Alert.alert('Success', 'Request cancelled successfully.');
            fetchRequests();
          } catch (error) {
            console.error('Failed to cancel request:', error);
            Alert.alert('Error', 'Failed to cancel request. Please try again.');
          }
        },
      },
    ]);
  };

  const handleViewDetails = (request: EmployeeRequest) => {
    try {
      (navigation as any).navigate('RequestDetails', { request, canApprove: false });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const renderRequestItem = ({ item }: { item: EmployeeRequest }) => {
    const statusColor = getStatusColor(item.status);
    const statusBg = getStatusBg(item.status);
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color="#4285F4" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.requestType} numberOfLines={1}>
              {item.requestType}
            </Text>
            <Text style={styles.requestDate}>
              Submitted {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {item.notes && (
          <Text style={styles.notesText} numberOfLines={2}>
            {item.notes}
          </Text>
        )}

        <View style={styles.cardDetails}>
          {item.startDate && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar" size={14} color="#999" />
              <Text style={styles.detailText}>{formatDate(item.startDate)}</Text>
            </View>
          )}
          {item.rejectionReason && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#F44336" />
              <Text style={[styles.detailText, { color: '#F44336' }]} numberOfLines={1}>
                {item.rejectionReason}
              </Text>
            </View>
          )}
        </View>

        {item.status === STATUSES.PENDING && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <MaterialCommunityIcons name="close-circle-outline" size={16} color="#FF5252" />
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="My Requests"
          onBackPress={() => navigation.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      <View style={styles.content}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={STATUS_TABS}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item: tab }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  activeTab === tab.key && styles.filterTabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeTab === tab.key && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Request List */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#4285F4" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : filteredRequests.length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No requests found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'ALL'
                  ? 'Create your first request using the + button'
                  : `No ${activeTab.toLowerCase()} requests`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredRequests}
              keyExtractor={(item) => item.id}
              renderItem={renderRequestItem}
              contentContainerStyle={styles.requestList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchRequests(true)}
                  colors={['#4285F4']}
                  tintColor="#4285F4"
                />
              }
            />
          )}
        </View>
      </View>

      {/* FAB - Create Request */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => (navigation as any).navigate('CreateRequest')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <BottomNavBar activeScreen="requests" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeAreaTop: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingBottom: 80,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#4285F4',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#CCC',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  requestList: {
    padding: 16,
    paddingBottom: 100,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  requestDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  cardDetails: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF525210',
    gap: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5252',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default MyRequestsScreen;
