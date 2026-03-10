/**
 * Filter Tabs Component
 * Reusable tab switcher for filtering payslips by status
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PayslipFilterTabsProps } from '../../types/payslip.types';

const TABS: Array<{ label: string; value: 'requested' | 'completed' | 'cancelled' }> = [
  { label: 'Requested', value: 'requested' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const FilterTabs: React.FC<PayslipFilterTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.filterContainer}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <TouchableOpacity
            key={tab.value}
            style={[styles.filterButton, isActive && styles.filterButtonActive]}
            onPress={() => onTabChange(tab.value)}
          >
            <Text 
              style={[styles.filterText, isActive && styles.filterTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit={false}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#F5F5F5',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  filterButtonActive: {
    backgroundColor: '#4285F4',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    includeFontPadding: false,
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
});
