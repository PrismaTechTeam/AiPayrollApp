/**
 * Leave Card Component
 * Reusable card component for displaying individual leave items
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LeaveCardProps } from '../../types/leave.types';

export const LeaveCard: React.FC<LeaveCardProps> = ({
  leave,
  onPress,
  onApprove,
  onReject,
  onCancel,
  onRestore,
  onViewDetails,
}) => {
  // Determine if action buttons should be shown based on status AND role
  // Only show approve/reject if status is 'requested' (PENDING) AND callbacks are provided (Manager role)
  const showApproveReject = leave.status === 'requested' && (onApprove || onReject);

  const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    requested: { label: 'Pending', bg: '#FFF3E0', text: '#E65100' },
    active: { label: 'Approved', bg: '#E8F5E9', text: '#2E7D32' },
    cancelled: { label: 'Cancelled', bg: '#FFEBEE', text: '#C62828' },
    rejected: { label: 'Rejected', bg: '#FFEBEE', text: '#C62828' },
    withdrawn: { label: 'Withdrawn', bg: '#F3E5F5', text: '#7B1FA2' },
  };
  const statusInfo = STATUS_CONFIG[leave.status || ''] || { label: leave.status || 'Unknown', bg: '#F5F5F5', text: '#666' };

  const handleCardPress = () => {
    console.log('🖱️ [LeaveCard] Card pressed for leave:', leave.id);
    if (onPress) {
      console.log('✅ [LeaveCard] Calling onPress with leave:', leave);
      onPress(leave);
    } else if (onViewDetails) {
      console.log('⚠️ [LeaveCard] Using onViewDetails fallback');
      // Fallback to onViewDetails for backward compatibility
      onViewDetails(leave.id);
    } else {
      console.warn('❌ [LeaveCard] No onPress or onViewDetails handler provided!');
    }
  };

  return (
    <TouchableOpacity
      style={styles.leaveCard}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {leave.avatarUrl ? (
          <View style={[styles.avatarPlaceholder, styles.avatarImage]} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {leave.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Leave Details */}
      <View style={styles.leaveDetails}>
        <Text style={styles.leaveName}>{leave.name}</Text>
        <Text style={styles.leaveDate}>{leave.dateRange}</Text>
        <Text style={styles.leaveType}>{leave.type}</Text>
      </View>

      {/* Right Side - Time and Actions */}
      <View style={styles.rightSection}>
        <Text style={styles.daysAgo}>{leave.daysAgo}</Text>
        {showApproveReject && (
          <View style={styles.actionButtons}>
            {onReject && (
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => onReject(leave.id)}
              >
                <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {onApprove && (
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => onApprove(leave.id)}
              >
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
        {!showApproveReject && (
          <View style={styles.actionContainer}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.text }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  leaveCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    backgroundColor: '#4285F4',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
  },
  leaveDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  leaveName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  leaveDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  leaveType: {
    fontSize: 13,
    color: '#4285F4',
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  daysAgo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    gap: 4,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5252',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    gap: 4,
  },
  restoreButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4285F4',
  },
  viewDetailsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
