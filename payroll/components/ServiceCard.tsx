/**
 * One service in the View All grid.
 *
 * Matches the Home screen's Quick Access tile deliberately: a pale tinted card, the
 * icon in a white square, the title in ink. These two grids list overlapping things
 * one tap apart, and when the same service was a saturated block here and a soft tile
 * there, the screen read as a different app.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from './auth/AuthBackdrop';

interface ServiceCardProps {
  title: string;
  icon: string;
  /** The service's colour, used for the icon and the chevron. */
  tint: string;
  /** The pale wash behind the card. */
  bg: string;
  onPress: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ title, icon, tint, bg, onPress }) => (
  <TouchableOpacity
    style={[styles.card, { backgroundColor: bg }]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
  >
    <View style={styles.top}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon as never} size={22} color={tint} />
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={tint} />
    </View>
    <Text style={styles.title} numberOfLines={2}>
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { width: '48.5%', borderRadius: 18, padding: 14, minHeight: 112 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: C.ink },
});
