/**
 * Date Selector Component
 * Scrollable horizontal date selector
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DateSelectorProps } from '../../types/attendance.types';

export const DateSelector: React.FC<DateSelectorProps> = ({
  dates,
  selectedDate,
  onDateSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Todays</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((date, index) => {
          const isSelected = selectedDate.fullDate === date.fullDate;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.dateItem, isSelected && styles.dateItemSelected]}
              onPress={() => onDateSelect(date)}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                {date.day}
              </Text>
              <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                {date.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 16,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 50,
  },
  dateItemSelected: {
    backgroundColor: '#4285F4',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
});
