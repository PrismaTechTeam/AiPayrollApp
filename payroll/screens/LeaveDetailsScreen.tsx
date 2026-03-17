/**
 * Leave Details Screen
 * Displays detailed information about a specific leave application
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomNavBar } from '../components/BottomNavBar';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { STATUSES, STATUS_COLORS, STATUS_LABELS } from '../constants/statuses';
import { useTheme } from '../context/ThemeContext';

type LeaveDetailsRouteParams = {
  LeaveDetails: {
    leaveId?: string;
    leave?: any;
    canApprove?: boolean;
  };
};

type LeaveDetailsRouteProp = RouteProp<LeaveDetailsRouteParams, 'LeaveDetails'>;

export const LeaveDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<LeaveDetailsRouteProp>();
  const { leaveId, leave: legacyLeave, canApprove = false } = route.params;

  const [leaveDetail, setLeaveDetail] = useState<LeaveApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadLeaveDetail();
  }, []);

  const loadLeaveDetail = async () => {
    const id = leaveId || legacyLeave?._raw?.id || legacyLeave?.id;
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await leaveService.getApplicationById(id);
      setLeaveDetail(data);
    } catch (err: any) {
      console.error('Failed to load leave detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
    if (colors) return colors.text;
    return '#9E9E9E';
  };

  const getStatusBgColor = (status: string) => {
    const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
    if (colors) return colors.bg;
    return '#F5F5F5';
  };

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Leave',
      'Are you sure you want to reject this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveService.rejectLeave(leaveDetail!.id, 'Rejected by owner');
              Alert.alert('Success', 'Leave rejected');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to reject leave');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Leave',
      'Are you sure you want to approve this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveService.approveLeave(leaveDetail!.id);
              Alert.alert('Success', 'Leave approved');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to approve leave');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleWithdraw = () => {
    Alert.alert(
      'Withdraw Leave',
      'Are you sure you want to withdraw this leave application?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveService.withdrawApplication(leaveDetail!.id, 'Withdrawn by employee');
              Alert.alert('Success', 'Leave withdrawn');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to withdraw leave');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Leave Details</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <BottomNavBar />
      </View>
    );
  }

  if (!leaveDetail) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Leave Details</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: colors.textTertiary }}>Leave not found</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {leaveDetail.employeeName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.userInfoSection}>
              <Text style={styles.userName}>{leaveDetail.employeeName}</Text>
              <Text style={styles.dateRange}>
                {formatDate(leaveDetail.startDate)} - {formatDate(leaveDetail.endDate)}
              </Text>
              <Text style={styles.leaveApplication}>
                {leaveDetail.leaveTypeDescription}
              </Text>
            </View>

            <View style={styles.rightSection}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(leaveDetail.status) },
                ]}
              >
                <Text style={[styles.statusText, { color: '#FFFFFF' }]}>
                  {getStatusLabel(leaveDetail.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Leave Duration Display */}
          <View style={styles.durationSection}>
            <Text style={styles.daysCount}>{leaveDetail.totalDays} Days</Text>
            {leaveDetail.isHalfDayStart && (
              <Text style={styles.halfDayNote}>Half day start</Text>
            )}
            {leaveDetail.isHalfDayEnd && (
              <Text style={styles.halfDayNote}>Half day end</Text>
            )}
          </View>

          {/* Reason Section */}
          {leaveDetail.reason && (
            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{leaveDetail.reason}</Text>
            </View>
          )}

          {/* Rejection Reason */}
          {leaveDetail.rejectionReason && (
            <View style={[styles.reasonSection, { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8 }]}>
              <Text style={[styles.reasonLabel, { color: '#C62828' }]}>Rejection Reason:</Text>
              <Text style={styles.reasonText}>{leaveDetail.rejectionReason}</Text>
            </View>
          )}

          {/* Approval Info */}
          {leaveDetail.approvedAt && (
            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Approved:</Text>
              <Text style={styles.reasonText}>
                {formatDate(leaveDetail.approvedAt)}
                {leaveDetail.approvedByEmployeeName && ` by ${leaveDetail.approvedByEmployeeName}`}
              </Text>
            </View>
          )}

          {/* Action Buttons for Pending (owner only) */}
          {leaveDetail.status === STATUSES.PENDING && canApprove && !actionLoading && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleReject}>
                <Text style={styles.cancelButtonText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Withdraw for own pending leaves */}
          {leaveDetail.status === STATUSES.PENDING && !actionLoading && (
            <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
              <Text style={styles.withdrawButtonText}>Withdraw Application</Text>
            </TouchableOpacity>
          )}

          {actionLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
          )}
        </View>
      </ScrollView>

      <BottomNavBar />
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
  },
  userRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  userInfoSection: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  leaveApplication: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  durationSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  daysCount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  halfDayNote: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  reasonSection: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  approveButton: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  withdrawButton: {
    backgroundColor: '#F3E5F5',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 12,
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B1FA2',
  },
});
