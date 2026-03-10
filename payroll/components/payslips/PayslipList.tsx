/**
 * Payslip List Component
 * Reusable list component for displaying multiple payslips
 */

import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { PayslipListProps } from '../../types/payslip.types';
import { PayslipCard } from './PayslipCard';

export const PayslipList: React.FC<PayslipListProps> = ({
  payslips,
  onPress,
  onApprove,
  onReject,
  onCancel,
  onViewDetails,
}) => {
  if (payslips.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No payslips found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {payslips.map((payslip) => (
        <PayslipCard
          key={payslip.id}
          payslip={payslip}
          onPress={onPress}
          onApprove={onApprove}
          onReject={onReject}
          onCancel={onCancel}
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
    color: '#999',
    fontWeight: '500',
  },
});
