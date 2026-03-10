import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface AttendanceCardProps {
  label: string;
  count: number;
  color: string;
  onPress?: () => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ label, count, color, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.circle, { backgroundColor: color + '10' }]}>
        <Text style={[styles.count, { color }]}>{count}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  count: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

