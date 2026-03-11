import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Header } from '../components/requests';
import { BottomNavBar } from '../components/BottomNavBar';
import requestService, { EmployeeRequest } from '../api/services/requestService';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return '#FF9800';
    case 'APPROVED':
      return '#4CAF50';
    case 'REJECTED':
      return '#F44336';
    case 'CANCELLED':
      return '#9E9E9E';
    default:
      return '#9E9E9E';
  }
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

interface RequestsScreenProps {
  navigation?: any;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
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
      const result = await requestService.getPendingApprovals({ pageSize: 100 });
      setRequests(result.items);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      Alert.alert('Error', 'Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests =
    activeTab === 'ALL'
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const handleApprove = (requestId: string) => {
    Alert.alert('Approve Request', 'Are you sure you want to approve this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await requestService.approveRequest(requestId);
            Alert.alert('Success', 'Request approved successfully.');
            fetchRequests();
          } catch (error) {
            console.error('Failed to approve request:', error);
            Alert.alert('Error', 'Failed to approve request. Please try again.');
          }
        },
      },
    ]);
  };

  const handleReject = (requestId: string) => {
    Alert.prompt(
      'Reject Request',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason?: string) => {
            try {
              await requestService.rejectRequest(requestId, reason || 'No reason provided');
              Alert.alert('Success', 'Request rejected successfully.');
              fetchRequests();
            } catch (error) {
              console.error('Failed to reject request:', error);
              Alert.alert('Error', 'Failed to reject request. Please try again.');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleViewDetails = (request: EmployeeRequest) => {
    try {
      navigation?.navigate('RequestDetails', { request });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const renderRequestItem = ({ item }: { item: EmployeeRequest }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {(item.employeeName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.employeeName} numberOfLines={1}>
              {item.employeeName || 'Unknown Employee'}
            </Text>
            <Text style={styles.requestType} numberOfLines={1}>
              {item.requestType}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="calendar" size={14} color="#999" />
            <Text style={styles.detailText}>{formatDate(item.startDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
            <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {item.status === 'PENDING' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.cardActionButton, styles.rejectActionButton]}
              onPress={() => handleReject(item.id)}
            >
              <MaterialCommunityIcons name="close" size={16} color="#FF5252" />
              <Text style={[styles.cardActionText, { color: '#FF5252' }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cardActionButton, styles.approveActionButton]}
              onPress={() => handleApprove(item.id)}
            >
              <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
              <Text style={[styles.cardActionText, { color: '#4CAF50' }]}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Safe Area */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Request Approval"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      {/* Content Area */}
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

      {/* Bottom Navigation Bar */}
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
    color: '#999',
  },
  requestList: {
    padding: 16,
    gap: 12,
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
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  cardInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  requestType: {
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
  cardDetails: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#999',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  approveActionButton: {
    backgroundColor: '#4CAF5010',
  },
  rejectActionButton: {
    backgroundColor: '#FF525210',
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RequestsScreen;
