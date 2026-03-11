/**
 * ClaimCard Component
 * Displays individual claim information
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type ClaimStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Claim {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  claimTypeId?: string;
  location?: string;
  transDate: string;
  amount: number;
  status: ClaimStatus;
  description?: string;
  receiptNo?: string;
  receipts?: string[];
  attachmentFileName?: string | null;
  submittedFrom?: string;
  createdAt?: string;
  approvedAt?: string | null;
  rejectionReason?: string | null;
}

interface ClaimCardProps {
  claim: Claim;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showEmployeeName?: boolean;
}

const STATUS_DISPLAY: Record<ClaimStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#999' },
  PENDING: { label: 'Pending', color: '#4285F4' },
  APPROVED: { label: 'Approved', color: '#34A853' },
  REJECTED: { label: 'Rejected', color: '#EA4335' },
  CANCELLED: { label: 'Cancelled', color: '#546E7A' },
};

export const ClaimCard: React.FC<ClaimCardProps> = ({
  claim,
  onPress,
  onApprove,
  onReject,
  showEmployeeName = false,
}) => {
  const statusInfo = STATUS_DISPLAY[claim.status] || { label: claim.status, color: '#999' };

  const showApproveReject = claim.status === 'PENDING' && (onApprove || onReject);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Claim Type */}
      <Text style={styles.claimType}>{claim.type}</Text>

      {/* Employee Name (for managers) */}
      {showEmployeeName && (
        <View style={styles.employeeRow}>
          <MaterialCommunityIcons name="account-outline" size={16} color="#666" />
          <Text style={styles.employeeName}>{claim.employeeName}</Text>
        </View>
      )}

      {/* Description */}
      {claim.description && (
        <Text style={styles.location} numberOfLines={1}>
          {claim.description}
        </Text>
      )}

      {/* Date */}
      <Text style={styles.dateRange}>{formatDate(claim.transDate)}</Text>

      {/* Amount and Status Row */}
      <View style={styles.bottomRow}>
        <Text style={styles.amount}>${claim.amount.toFixed(2)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusText}>{statusInfo.label}</Text>
        </View>
      </View>

      {/* Action Buttons (for managers) */}
      {showApproveReject && (
        <View style={styles.actionButtons}>
          {onReject && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={(e) => {
                e.stopPropagation();
                onReject();
              }}
            >
              <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          )}
          {onApprove && (
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={(e) => {
                e.stopPropagation();
                onApprove();
              }}
            >
              <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  claimType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginBottom: 8,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  employeeName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  location: {
    fontSize: 14,
    color: '#999',
    marginBottom: 6,
  },
  dateRange: {
    fontSize: 14,
    color: '#FBBC04',
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EA4335',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#34A853',
  },
  rejectButton: {
    backgroundColor: '#EA4335',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
