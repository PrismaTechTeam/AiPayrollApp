import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface ServiceCardProps {
  title: string;
  count?: number;
  icon: string;
  color: string;
  onPress: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ title, count, icon, color, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: color, shadowColor: color }]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon as any} size={32} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {count !== undefined && (
        <Text style={styles.count}>{count}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 115,
    marginRight: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
