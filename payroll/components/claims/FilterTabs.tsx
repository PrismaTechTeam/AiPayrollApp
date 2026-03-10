/**
 * FilterTabs Component for Claims
 * Reusable filter tabs for filtering claims by status
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ClaimStatus } from './ClaimCard';

interface FilterTabsProps {
  selectedFilter: ClaimStatus | 'All';
  onFilterChange: (filter: ClaimStatus | 'All') => void;
  filters: Array<ClaimStatus | 'All'>;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  selectedFilter,
  onFilterChange,
  filters,
}) => {
  return (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => onFilterChange(filter)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  filterButtonActive: {
    backgroundColor: '#4285F4',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
});
