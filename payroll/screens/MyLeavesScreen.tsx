/**
 * My Leaves Screen (Employee View)
 * Display employee's own leave applications with status filtering and withdraw action
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
import { Header } from '../components/leaves';
import { BottomNavBar } from '../components/BottomNavBar';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { STATUSES, STATUS_COLORS } from '../constants/statuses';

type StatusFilter = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

const getStatusColor = (status: string) => {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  return colors?.text || '#9E9E9E';
};

const getStatusBg = (status: string) => {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  return colors?.bg || '#F5F5F5';
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatDateRange = (start: string, end: string) => {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const startStr = s.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const endStr = e.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  } catch {
    return `${start} - ${end}`;
  }
};

export const MyLeavesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL');
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaves = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const status = activeTab === 'ALL' ? undefined : activeTab;
      const result = await leaveService.getApplications({ page: 1, pageSize: 50, status });
      setLeaves(result.items || []);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      Alert.alert('Error', 'Failed to load leave applications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const filteredLeaves =
    activeTab === 'ALL'
      ? leaves
      : leaves.filter((l) => l.status === activeTab);

  const handleWithdraw = (leaveId: string) => {
    Alert.alert('Withdraw Leave', 'Are you sure you want to withdraw this leave application?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveService.withdrawApplication(leaveId, 'Withdrawn by employee');
            Alert.alert('Success', 'Leave application withdrawn successfully.');
            fetchLeaves();
          } catch (error: any) {
            console.error('Failed to withdraw leave:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to withdraw leave. Please try again.');
          }
        },
      },
    ]);
  };

  const handleViewDetails = (leave: LeaveApplication) => {
    try {
      (navigation as any).navigate('LeaveDetails', { leaveId: leave.id, leave, canApprove: false });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const renderLeaveItem = ({ item }: { item: LeaveApplication }) => {
    const statusColor = getStatusColor(item.status);
    const statusBg = getStatusBg(item.status);
    const leaveColor = item.leaveTypeColor || '#4285F4';

    return (
      <TouchableOpacity
        style={styles.leaveCard}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: leaveColor + '20' }]}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={leaveColor} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.leaveType} numberOfLines={1}>
              {item.leaveTypeDescription || 'Leave'}
            </Text>
            <Text style={styles.dateRange}>
              {formatDateRange(item.startDate, item.endDate)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
            <Text style={styles.detailText}>
              {item.totalDays} {item.totalDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="calendar-check" size={14} color="#999" />
            <Text style={styles.detailText}>Submitted {formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {item.reason && (
          <Text style={styles.reasonText} numberOfLines={2}>
            {item.reason}
          </Text>
        )}

        {item.rejectionReason && (
          <View style={styles.rejectionContainer}>
            <MaterialCommunityIcons name="information-outline" size={14} color="#C62828" />
            <Text style={styles.rejectionText} numberOfLines={2}>
              {item.rejectionReason}
            </Text>
          </View>
        )}

        {(item.status === STATUSES.PENDING || item.status === STATUSES.APPROVED) && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => handleWithdraw(item.id)}
            >
              <MaterialCommunityIcons name="undo-variant" size={16} color="#FF5252" />
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
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
          title="My Leaves"
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

        {/* Leave List */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#4285F4" />
              <Text style={styles.loadingText}>Loading leave applications...</Text>
            </View>
          ) : filteredLeaves.length === 0 ? (
            <View style={styles.centerContainer}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No leave applications found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'ALL'
                  ? 'Apply for leave using the + button'
                  : `No ${activeTab.toLowerCase()} leave applications`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredLeaves}
              keyExtractor={(item) => item.id}
              renderItem={renderLeaveItem}
              contentContainerStyle={styles.leaveList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchLeaves(true)}
                  colors={['#4285F4']}
                  tintColor="#4285F4"
                />
              }
            />
          )}
        </View>
      </View>

      {/* FAB - Create Leave */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => (navigation as any).navigate('CreateLeave')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <BottomNavBar />
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
  leaveList: {
    padding: 16,
    paddingBottom: 100,
  },
  leaveCard: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dateRange: {
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
  reasonText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  rejectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 8,
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 8,
  },
  rejectionText: {
    fontSize: 12,
    color: '#C62828',
    flex: 1,
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF525210',
    gap: 4,
  },
  withdrawButtonText: {
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

export default MyLeavesScreen;
