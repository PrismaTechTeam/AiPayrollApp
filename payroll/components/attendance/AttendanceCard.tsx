/**
 * Attendance Card Component
 * Reusable card component for displaying individual attendance records
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AttendanceCardProps } from '../../types/attendance.types';
import { useTheme } from '../../context/ThemeContext';

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  attendance,
  onPress,
}) => {
  const { colors } = useTheme();
  const getStatusColor = () => {
    switch (attendance.status) {
      case 'Present':
        return '#4285F4'; // Blue
      case 'Late':
        return '#FFB300'; // Orange
      case 'Absent':
        return '#FF5252'; // Red
      default:
        return '#999';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(attendance)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {attendance.avatarUrl ? (
          <View style={[styles.avatar, styles.avatarImage]} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {attendance.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Attendance Details */}
      <View style={styles.detailsContainer}>
        {/* Check-in */}
        <View style={styles.timeContainer}>
          <Text style={styles.label}>Check-in</Text>
          <Text style={styles.checkInTime}>{attendance.checkIn}</Text>
        </View>

        {/* Check-out */}
        <View style={styles.timeContainer}>
          <Text style={styles.label}>Check-out</Text>
          <Text style={styles.checkOutTime}>{attendance.checkOut}</Text>
        </View>

        {/* Location */}
        <View style={styles.locationContainer}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#FF9800" />
          <Text style={styles.locationText}>{attendance.location}</Text>
        </View>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusText}>{attendance.status}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    backgroundColor: colors.primary,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  detailsContainer: {
    flex: 1,
  },
  timeContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  checkInTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary, // Blue color for check-in
  },
  checkOutTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F44336', // Red color for check-out
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
