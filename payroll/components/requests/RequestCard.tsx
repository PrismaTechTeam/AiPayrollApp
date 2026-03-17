/**
 * Request Card Component
 * Reusable card component for displaying individual request items
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { RequestCardProps } from '../../types/request.types';
import { usePayrollAuth } from '../../context/PayrollAuthContext';
import { hasRoleAccess, ROLE_GROUPS } from '../../constants/userRoles';

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onPress,
  onApprove,
  onReject,
  onCancel,
  onRestore,
  onViewDetails,
}) => {
  // Check user role for permissions
  const { currentRole } = usePayrollAuth();
  const canApprove = hasRoleAccess(currentRole || undefined, ROLE_GROUPS.CAN_APPROVE_REQUESTS);
  
  // Determine if action buttons should be shown based on status AND role
  const showActions = request.status === 'requested' && canApprove;
  const isActive = request.status === 'active';
  const isCancelled = request.status === 'cancelled';
  const showRestoreButton = isCancelled && canApprove;

  const handleCardPress = () => {
    console.log('🖱️ [RequestCard] Card pressed for request:', request.id);
    if (onPress) {
      console.log('✅ [RequestCard] Calling onPress with request:', request);
      onPress(request);
    } else if (onViewDetails) {
      console.log('⚠️ [RequestCard] Using onViewDetails fallback');
      // Fallback to onViewDetails for backward compatibility
      onViewDetails(request.id);
    } else {
      console.warn('❌ [RequestCard] No onPress or onViewDetails handler provided!');
    }
  };

  return (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {request.avatarUrl ? (
          <View style={[styles.avatarPlaceholder, styles.avatarImage]} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {request.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Request Details */}
      <View style={styles.requestDetails}>
        <Text style={styles.requestName}>{request.name}</Text>
        <Text style={styles.requestDate}>{request.dateRange}</Text>
        <Text style={styles.requestType}>{request.type}</Text>
      </View>

      {/* Right Side - Time and Actions */}
      <View style={styles.rightSection}>
        <Text style={styles.daysAgo}>{request.daysAgo}</Text>
        {showActions && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => onReject?.(request.id)}
            >
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => onApprove?.(request.id)}
            >
              <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        {!showActions && (
          <View style={styles.actionContainer}>
            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {isActive ? 'Active' : 'Cancelled'}
              </Text>
            </View>
            
            {/* Additional Actions for Active/Cancelled */}
            {isActive && onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => onCancel(request.id)}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color="#FF5252" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            
            {/* Restore button for cancelled requests (Owner only) */}
            {showRestoreButton && onRestore && (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={() => onRestore(request.id)}
              >
                <MaterialCommunityIcons name="restore" size={18} color="#4285F4" />
                <Text style={styles.restoreButtonText}>Restore</Text>
              </TouchableOpacity>
            )}
            
            {/* View Details button for all statuses (if onPress not provided) */}
            {!onPress && onViewDetails && (
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => onViewDetails(request.id)}
              >
                <MaterialCommunityIcons name="eye" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
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
  requestDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  requestName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  requestType: {
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

