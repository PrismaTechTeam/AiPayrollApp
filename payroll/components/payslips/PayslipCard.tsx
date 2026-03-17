/**
 * Payslip Card Component
 * Reusable card component for displaying individual payslip items
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PayslipCardProps } from '../../types/payslip.types';
import { useTheme } from '../../context/ThemeContext';

export const PayslipCard: React.FC<PayslipCardProps> = ({
  payslip,
  onPress,
  onApprove,
  onReject,
  onCancel,
  onViewDetails,
}) => {
  const { colors } = useTheme();
  // Determine if action buttons should be shown based on status
  const showActions = payslip.status === 'requested';
  const isCompleted = payslip.status === 'completed';
  const isCancelled = payslip.status === 'cancelled';

  const handleCardPress = () => {
    console.log('🖱️ [PayslipCard] Card pressed for payslip:', payslip.id);
    if (onPress) {
      console.log('✅ [PayslipCard] Calling onPress with payslip:', payslip);
      onPress(payslip);
    } else if (onViewDetails) {
      console.log('⚠️ [PayslipCard] Using onViewDetails fallback');
      // Fallback to onViewDetails for backward compatibility
      onViewDetails(payslip.id);
    } else {
      console.warn('❌ [PayslipCard] No onPress or onViewDetails handler provided!');
    }
  };

  return (
    <TouchableOpacity
      style={styles.payslipCard}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {payslip.avatarUrl ? (
          <View style={[styles.avatarPlaceholder, styles.avatarImage]} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {payslip.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Payslip Details */}
      <View style={styles.payslipDetails}>
        <Text style={styles.payslipName}>{payslip.name}</Text>
        <Text style={styles.payslipDateRange}>{payslip.dateRange}</Text>
        <Text style={styles.payslipType}>{payslip.type}</Text>
      </View>

      {/* Right Side - Date, Amount, and Actions */}
      <View style={styles.rightSection}>
        <Text style={styles.date}>{payslip.date}</Text>
        <View style={styles.amountContainer}>
          <MaterialCommunityIcons name="paperclip" size={16} color={colors.primary} />
          <Text style={styles.amount}>{payslip.amount}</Text>
        </View>
        {showActions && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => onReject?.(payslip.id)}
            >
              <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => onApprove?.(payslip.id)}
            >
              <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
        {!showActions && (
          <View style={styles.statusContainer}>
            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {isCompleted ? 'Completed' : 'Cancelled'}
              </Text>
            </View>
            
            {/* View Details button (if onPress not provided) */}
            {!onPress && onViewDetails && (
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => onViewDetails(payslip.id)}
              >
                <MaterialCommunityIcons name="eye" size={16} color={colors.icon} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  payslipCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  payslipDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  payslipName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  payslipDateRange: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  payslipType: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F44336', // Red color for amount
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
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  viewDetailsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
