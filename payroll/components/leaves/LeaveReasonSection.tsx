/**
 * LeaveReasonSection
 * Shows leave reason and rejection reason (if any).
 * Visible to all roles.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LeaveReasonSectionProps {
  reason: string | null;
  rejectionReason: string | null;
}

export const LeaveReasonSection: React.FC<LeaveReasonSectionProps> = ({
  reason,
  rejectionReason,
}) => {
  const { colors } = useTheme();

  if (!reason && !rejectionReason) return null;

  return (
    <>
      {reason && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Reason:</Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>{reason}</Text>
        </View>
      )}

      {rejectionReason && (
        <View style={[styles.section, styles.rejectionBox]}>
          <Text style={[styles.label, { color: '#C62828' }]}>Rejection Reason:</Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>{rejectionReason}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  rejectionBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
});
