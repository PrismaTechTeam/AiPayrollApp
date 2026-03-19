import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Header, FilterTabs, LeaveList } from '../components/leaves';
import { BottomNavBar } from '../components/BottomNavBar';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { isOwner as checkIsOwner } from '../constants/userRoles';
import { STATUSES } from '../constants/statuses';

interface LeavesScreenProps {
  navigation?: any;
}

export const LeavesScreen: React.FC<LeavesScreenProps> = ({ navigation: navProp }) => {
  const navigation = navProp || useNavigation();
  const { currentRole } = usePayrollAuth();
  const isHR = checkIsOwner(currentRole); // Owner/HR/Admin sees all tenant leaves
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);

      const fetchFn = isHR
        ? leaveService.getAllLeaveApplications.bind(leaveService)
        : leaveService.getApproverLeaves.bind(leaveService);

      if (activeTab === 'CANCELLED') {
        // Cancelled tab: show both CANCELLED and WITHDRAWN leaves
        const [cancelled, withdrawn] = await Promise.all([
          fetchFn({ page: 1, pageSize: 50, status: 'CANCELLED' }),
          fetchFn({ page: 1, pageSize: 50, status: 'WITHDRAWN' }),
        ]);
        const combined = [...(cancelled.items || []), ...(withdrawn.items || [])];
        setLeaves(combined.map(mapLeaveToLegacy));
      } else {
        const status = activeTab === 'ALL' ? undefined : activeTab;
        const result = await fetchFn({ page: 1, pageSize: 50, status });
        setLeaves((result.items || []).map(mapLeaveToLegacy));
      }
    } catch (err: any) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isHR]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const mapLeaveToLegacy = (item: LeaveApplication) => ({
    id: item.id,
    name: item.employeeName,
    dateRange: `${formatDateShort(item.startDate)} - ${formatDateShort(item.endDate)}`,
    type: item.leaveTypeDescription || 'Leave Application',
    daysAgo: formatTimeAgo(item.createdAt),
    status: mapStatusToLegacy(item.status),
    _raw: item,
  });

  const formatDateShort = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch { return dateStr; }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Today';
      if (days === 1) return '1 day ago';
      return `${days} days ago`;
    } catch { return ''; }
  };

  const mapStatusToLegacy = (status: string): string => {
    switch (status) {
      case STATUSES.PENDING: return 'requested';
      case STATUSES.APPROVED: return 'active';
      case STATUSES.REJECTED: return 'rejected';
      case STATUSES.CANCELLED: return 'cancelled';
      case STATUSES.WITHDRAWN: return 'cancelled'; // Show withdrawn as cancelled for HR view
      default: return 'requested';
    }
  };

  const handleApprove = async (leaveId: string) => {
    setActionLoading(leaveId);
    try {
      await leaveService.approveLeave(leaveId);
      Alert.alert('Success', 'Leave approved');
      fetchLeaves();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to approve leave');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (leaveId: string) => {
    Alert.prompt?.(
      'Reject Leave',
      'Enter rejection reason:',
      async (reason: string) => {
        if (!reason) return;
        setActionLoading(leaveId);
        try {
          await leaveService.rejectLeave(leaveId, reason);
          Alert.alert('Success', 'Leave rejected');
          fetchLeaves();
        } catch (err: any) {
          Alert.alert('Error', err.response?.data?.message || 'Failed to reject leave');
        } finally {
          setActionLoading(null);
        }
      }
    ) || Alert.alert('Reject', 'Rejection requires a reason input');
  };

  const handleRestore = (leaveId: string) => {
    console.log('Restore cancelled leave:', leaveId);
  };

  const handleViewDetails = (leave: any) => {
    try {
      navigation?.navigate('LeaveDetails', { leaveId: leave._raw?.id || leave.id, leave, canApprove: true });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <Header
          title="Leave Approval"
          onBackPress={() => navigation?.goBack()}
          showBackButton={true}
        />
      </SafeAreaView>

      <View style={styles.content}>
        <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4285F4" />
            </View>
          ) : leaves.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No leave applications found</Text>
            </View>
          ) : (
            <LeaveList
              leaves={leaves}
              onPress={handleViewDetails}
            />
          )}
        </View>
      </View>

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
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default LeavesScreen;
