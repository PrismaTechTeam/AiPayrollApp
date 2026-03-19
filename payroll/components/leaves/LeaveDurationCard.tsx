/**
 * LeaveDurationCard
 * Shows total leave days and half-day indicators.
 * Visible to all roles.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LeaveDurationCardProps {
  totalDays: number;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
}

export const LeaveDurationCard: React.FC<LeaveDurationCardProps> = ({
  totalDays,
  isHalfDayStart,
  isHalfDayEnd,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.daysCount, { color: colors.primary }]}>
        {totalDays} {totalDays === 1 ? 'Day' : 'Days'}
      </Text>
      {isHalfDayStart && (
        <Text style={[styles.halfDayNote, { color: colors.textTertiary }]}>Half day start</Text>
      )}
      {isHalfDayEnd && (
        <Text style={[styles.halfDayNote, { color: colors.textTertiary }]}>Half day end</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  daysCount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  halfDayNote: {
    fontSize: 12,
  },
});
