/**
 * LeaveActions
 * Role-based action buttons for leave applications.
 *
 * - Employee: sees "Withdraw Application" on their own pending/approved leaves
 * - Department Head / Owner: sees "Approve" and "Reject" when the current
 *   approval step is pending and belongs to them
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LeaveActionsProps {
  /** 'employee' | 'approver' */
  role: 'employee' | 'approver';
  status: string;
  actionLoading: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onWithdraw?: () => void;
}

export const LeaveActions: React.FC<LeaveActionsProps> = ({
  role,
  status,
  actionLoading,
  onApprove,
  onReject,
  onWithdraw,
}) => {
  const { colors } = useTheme();

  if (actionLoading) {
    return <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />;
  }

  if (status !== 'PENDING') return null;

  // Approver view: Approve + Reject
  if (role === 'approver' && onApprove && onReject) {
    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.rejectButton, { backgroundColor: colors.error + '15' }]}
          onPress={onReject}
        >
          <Text style={[styles.rejectButtonText, { color: colors.error }]}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.approveButton, { backgroundColor: colors.success }]}
          onPress={onApprove}
        >
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Employee view: Withdraw
  if (role === 'employee' && onWithdraw) {
    return (
      <TouchableOpacity style={styles.withdrawButton} onPress={onWithdraw}>
        <Text style={styles.withdrawButtonText}>Withdraw Application</Text>
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  rejectButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  approveButton: {
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
