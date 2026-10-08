/**
 * One service in the View All grid: the icon on a soft wash, the name under it.
 *
 * A launcher item rather than a card, four to a row, so the whole list fits one
 * phone screen instead of a two-column wall of cards to scroll through. The
 * icon and its colour are the ones Home's tile for the same thing uses.
 *
 * The width comes from the caller, worked out from the window: a percentage
 * plus a gap overflowed the row on a 360dp Android phone and the grid fell
 * apart into one lonely column.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from './auth/AuthBackdrop';
import type { IconName } from './auth/PrimaryButton';

interface ServiceCardProps {
  title: string;
  icon: IconName;
  /** The service's colour, used for the icon. */
  tint: string;
  /** The pale wash behind the icon. */
  bg: string;
  /** Exact width in points, so a row of them always fits. */
  width: number;
  onPress: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ title, icon, tint, bg, width, onPress }) => (
  <TouchableOpacity
    style={[styles.item, { width }]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={[styles.iconBox, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} size={22} color={tint} />
    </View>
    {/* Capped so a two-line name ("Request Approval") still fits its two reserved lines at a
        large system font, instead of being clipped. */}
    <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.3}>
      {title}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Two lines of label are reserved on every item, so a row of one-line and
  // two-line names still lines up.
  item: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2, minHeight: 92 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 12, lineHeight: 16, minHeight: 32, fontWeight: '600', color: C.ink, textAlign: 'center', marginTop: 6 },
});

export default ServiceCard;
