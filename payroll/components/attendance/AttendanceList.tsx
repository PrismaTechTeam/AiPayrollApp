/**
 * Attendance List Component
 * Reusable list component for displaying multiple attendance records
 */

import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { AttendanceListProps } from '../../types/attendance.types';
import { AttendanceCard } from './AttendanceCard';

export const AttendanceList: React.FC<AttendanceListProps> = ({
  attendances,
  onPress,
}) => {
  if (attendances.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No attendance records found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {attendances.map((attendance) => (
        <AttendanceCard
          key={attendance.id}
          attendance={attendance}
          onPress={onPress}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
});
