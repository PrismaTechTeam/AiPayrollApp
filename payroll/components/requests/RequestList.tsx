/**
 * Request List Component
 * Reusable list component for displaying multiple requests
 */

import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { RequestListProps } from '../../types/request.types';
import { RequestCard } from './RequestCard';
import { useTheme } from '../../context/ThemeContext';

export const RequestList: React.FC<RequestListProps> = ({
  requests,
  onPress,
  onApprove,
  onReject,
  onCancel,
  onRestore,
  onViewDetails,
}) => {
  const { colors } = useTheme();
  if (requests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No requests found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
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
    color: colors.textTertiary,
    fontWeight: '500',
  },
});

