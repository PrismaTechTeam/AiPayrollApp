/**
 * Leave Details Screen
 * Displays leave application details with role-based UI:
 *
 * - Employee:        Applicant card, duration, reason, withdraw action
 * - Department Head: Applicant card, duration, reason, approval timeline, approve/reject actions
 * - Owner:           Applicant card, duration, reason, approval timeline, approve/reject actions
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
import { useTheme } from '../context/ThemeContext';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { isOwner } from '../constants/userRoles';
import { BottomNavBar } from '../components/BottomNavBar';
import {
  LeaveApplicantCard,
  LeaveDurationCard,
  LeaveReasonSection,
  LeaveApprovalTimeline,
  LeaveActions,
} from '../components/leaves';
import leaveService, { LeaveApplication } from '../api/services/leaveService';
import { STATUSES } from '../constants/statuses';

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
  const route = useRoute<LeaveDetailsRouteProp>();
  const { colors } = useTheme();
  const { currentRole, user } = usePayrollAuth();
  const { leaveId, leave: legacyLeave, canApprove = false } = route.params;

  const [leaveDetail, setLeaveDetail] = useState<LeaveApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Is the viewer an Owner/HR/Admin (non-employee)?
  const isHROrOwner = canApprove && isOwner(currentRole);

  // Find the current pending approval step
  const currentPendingStep = leaveDetail?.status === STATUSES.PENDING
    ? leaveDetail?.approvals?.find(
        a => a.stepOrder === leaveDetail.currentApprovalStep && a.status === 'PENDING'
      )
    : undefined;

  // Check if the current user is the designated approver for the current pending step:
  // - Match by approverId (employee ID) for named approvers (e.g. Department Head)
  // - Match by approverRoleId for role-based approvers (e.g. HR role)
  //   Since we don't have roleId GUID on frontend, role-based steps show for
  //   Owner/HR when approverId is null (role-based step, not person-specific)
  const isCurrentStepApprover = currentPendingStep != null && (
    // Named approver: current user's employeeId matches the step's approverId
    (currentPendingStep.approverId != null && user?.employeeId === currentPendingStep.approverId) ||
    // Role-based approver: step has no specific person, only a role — show to Owner/HR
    (currentPendingStep.approverId == null && currentPendingStep.approverRoleId != null && isHROrOwner)
  );

  // Employee can withdraw their own pending leave (only when they're not viewing as approver)
  const isEmployeeView = !canApprove;

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
      // HR/Owner: use web API (no employee-level access check)
      // Employee/Dept Head: use mobile API (checks ownership or approver assignment)
      const data = isHROrOwner
        ? await leaveService.getApplicationByIdAsHR(id)
        : await leaveService.getApplicationById(id);
      setLeaveDetail(data);
    } catch (err: any) {
      console.error('Failed to load leave detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const handleApprove = () => {
    Alert.alert('Approve Leave', 'Are you sure you want to approve this leave request?', [
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
    ]);
  };

  const handleReject = () => {
    Alert.alert('Reject Leave', 'Are you sure you want to reject this leave request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaveService.rejectLeave(leaveDetail!.id, 'Rejected by approver');
            Alert.alert('Success', 'Leave rejected');
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to reject leave');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert('Withdraw Leave', 'Are you sure you want to withdraw this leave application?', [
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
    ]);
  };

  // --- Header (shared across loading/empty/detail states) ---
  const renderHeader = () => (
    <SafeAreaView style={[styles.safeAreaTop, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Leave Details</Text>
        <View style={{ width: 40 }} />
      </View>
    </SafeAreaView>
  );

  // --- Loading state ---
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.surface} />
        {renderHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <BottomNavBar />
      </View>
    );
  }

  // --- Not found state ---
  if (!leaveDetail) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.surface} />
        {renderHeader()}
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="file-document-remove-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Leave not found</Text>
        </View>
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.surface} />
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* === Visible to ALL roles === */}
          <LeaveApplicantCard
            employeeName={leaveDetail.employeeName}
            startDate={leaveDetail.startDate}
            endDate={leaveDetail.endDate}
            leaveTypeDescription={leaveDetail.leaveTypeDescription}
            status={leaveDetail.status}
            formatDate={formatDate}
          />

          <LeaveDurationCard
            totalDays={leaveDetail.totalDays}
            isHalfDayStart={leaveDetail.isHalfDayStart}
            isHalfDayEnd={leaveDetail.isHalfDayEnd}
          />

          <LeaveReasonSection
            reason={leaveDetail.reason}
            rejectionReason={leaveDetail.rejectionReason}
          />

          {/* === Approval timeline - visible to ALL roles === */}
          <LeaveApprovalTimeline
            approvals={leaveDetail.approvals}
            formatDate={formatDate}
          />

          {/* === Role-based actions === */}
          {/* Approve/Reject: only visible to the approver of the CURRENT pending step */}
          {isCurrentStepApprover && (
            <LeaveActions
              role="approver"
              status={leaveDetail.status}
              actionLoading={actionLoading}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {/* Withdraw: only visible to the employee who submitted the leave */}
          {isEmployeeView && (
            <LeaveActions
              role="employee"
              status={leaveDetail.status}
              actionLoading={actionLoading}
              onWithdraw={handleWithdraw}
            />
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
  },
  safeAreaTop: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 12,
    padding: 20,
  },
});

export default LeaveDetailsScreen;
