/**
 * Leave List Component
 * Reusable list component for displaying multiple leaves
 */

import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { LeaveListProps } from '../../types/leave.types';
import { LeaveCard } from './LeaveCard';

export const LeaveList: React.FC<LeaveListProps> = ({
  leaves,
  onPress,
  onApprove,
  onReject,
  onCancel,
  onRestore,
  onViewDetails,
}) => {
  if (leaves.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No leaves found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {leaves.map((leave) => (
        <LeaveCard
          key={leave.id}
          leave={leave}
          onPress={onPress}
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
          onRestore={onRestore}
          onViewDetails={onViewDetails}
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
    padding: 16,
    paddingBottom: 100,
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
