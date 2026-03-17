import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AttendanceCardProps {
  label: string;
  count: number;
  color: string;
  onPress?: () => void;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ label, count, color, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: color, shadowColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.circle, { backgroundColor: color + '25' }]}>
        <Text style={[styles.count, { color }]}>{count}</Text>
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    fontSize: 28,
    fontWeight: '800',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
