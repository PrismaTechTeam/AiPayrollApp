/**
 * LeaveApprovalTimeline
 * Shows multi-step approval progress with status icons.
 * Visible to Department Head and Owner roles only.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';
import { STATUS_LABELS } from '../../constants/statuses';
import { LeaveApprovalStep } from '../../api/services/leaveService';

interface LeaveApprovalTimelineProps {
  approvals: LeaveApprovalStep[];
  formatDate: (dateStr: string) => string;
}

const getStepStatusColor = (status: string): string => {
  switch (status) {
    case 'APPROVED': return '#4CAF50';
    case 'REJECTED': return '#F44336';
    case 'PENDING': return '#FF9800';
    default: return '#9E9E9E';
  }
};

const getStepIcon = (status: string): 'check' | 'close' | 'clock-outline' | 'minus' => {
  switch (status) {
    case 'APPROVED': return 'check';
    case 'REJECTED': return 'close';
    case 'PENDING': return 'clock-outline';
    default: return 'minus';
  }
};

export const LeaveApprovalTimeline: React.FC<LeaveApprovalTimelineProps> = ({
  approvals,
  formatDate,
}) => {
  const { colors } = useTheme();

  if (!approvals || approvals.length === 0) return null;

  const sorted = [...approvals].sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Approval Steps</Text>
      <View style={styles.timeline}>
        {sorted.map((step, index) => {
          const isLast = index === sorted.length - 1;
          const stepColor = getStepStatusColor(step.status);
          const icon = getStepIcon(step.status);
          const statusLabel = STATUS_LABELS[step.status as keyof typeof STATUS_LABELS] || step.status;

          return (
            <View key={step.id} style={styles.timelineItem}>
              {/* Timeline connector */}
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, { backgroundColor: stepColor }]}>
                  <MaterialCommunityIcons name={icon} size={14} color="#FFF" />
                </View>
                {!isLast && <View style={[styles.line, { backgroundColor: stepColor + '40' }]} />}
              </View>

              {/* Step content */}
              <View style={[styles.content, !isLast && { paddingBottom: 16 }]}>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepName, { color: colors.text }]}>
                    Step {step.stepOrder}: {step.stepName}
                  </Text>
                  <View style={[styles.stepBadge, { backgroundColor: stepColor + '18' }]}>
                    <Text style={[styles.stepBadgeText, { color: stepColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                {step.approverName && (
                  <View style={styles.detail}>
                    <MaterialCommunityIcons name="account" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {step.approverName}
                    </Text>
                  </View>
                )}
                {step.approvedAt && (
                  <View style={styles.detail}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {formatDate(step.approvedAt)}
                    </Text>
                  </View>
                )}
                {step.comments && (
                  <View style={styles.detail}>
                    <MaterialCommunityIcons name="comment-text-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      {step.comments}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  timeline: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingTop: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
});
