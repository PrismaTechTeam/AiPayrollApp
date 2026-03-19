/**
 * LeaveApplicantCard
 * Shows employee avatar, name, date range, leave type, and status badge.
 * Visible to all roles.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { STATUS_COLORS, STATUS_LABELS } from '../../constants/statuses';

interface LeaveApplicantCardProps {
  employeeName: string;
  startDate: string;
  endDate: string;
  leaveTypeDescription: string;
  status: string;
  formatDate: (dateStr: string) => string;
}

export const LeaveApplicantCard: React.FC<LeaveApplicantCardProps> = ({
  employeeName,
  startDate,
  endDate,
  leaveTypeDescription,
  status,
  formatDate,
}) => {
  const { colors } = useTheme();

  const getStatusColor = (s: string) => {
    const c = STATUS_COLORS[s as keyof typeof STATUS_COLORS];
    return c?.text || '#9E9E9E';
  };

  const getStatusLabel = (s: string) => {
    return STATUS_LABELS[s as keyof typeof STATUS_LABELS] || s;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { backgroundColor: colors.border }]}>
        <Text style={[styles.avatarInitial, { color: colors.textSecondary }]}>
          {employeeName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={[styles.name, { color: colors.text }]}>{employeeName}</Text>
        <Text style={[styles.dateRange, { color: colors.textTertiary }]}>
          {formatDate(startDate)} - {formatDate(endDate)}
        </Text>
        <Text style={[styles.leaveType, { color: colors.primary }]}>
          {leaveTypeDescription}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
  },
  infoSection: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 14,
    marginBottom: 4,
  },
  leaveType: {
    fontSize: 14,
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
});
