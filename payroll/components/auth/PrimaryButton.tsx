/**
 * The full-width blue gradient button used for the main action on the
 * signed-out and account screens. One component so the shadow, height and
 * disabled look cannot drift between screens.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from './AuthBackdrop';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** `outline` is the quieter twin for secondary actions such as "Turn off";
   *  `dangerSolid` is the red confirm of a destructive dialog. */
  variant?: 'solid' | 'outline' | 'danger' | 'dangerSolid';
  /** Shorter height for dialogs and side-by-side pairs. */
  compact?: boolean;
}

export const PrimaryButton: React.FC<Props> = ({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  variant = 'solid',
  compact = false,
}) => {
  const inactive = disabled || loading;
  const height = compact ? 48 : 56;
  const content = (color: string) => (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={20} color={color} />}
          <Text style={[styles.text, { color }]}>{label}</Text>
        </>
      )}
    </>
  );

  if (variant === 'solid' || variant === 'dangerSolid') {
    const colors: [string, string] = variant === 'solid' ? [C.blueDeep, C.blueLight] : ['#DC2626', '#F87171'];
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        style={[styles.wrap, styles.shadow, variant === 'dangerSolid' && styles.shadowDanger, disabled && styles.disabled]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.body, { height }]}
        >
          {content('#FFFFFF')}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const color = variant === 'danger' ? C.danger : C.blue;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={[styles.wrap, disabled && styles.disabled]}
    >
      <View style={[styles.body, styles.outline, { height, borderColor: variant === 'danger' ? C.dangerLine : '#C9DAF8' }]}>
        {content(color)}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
  },
  shadow: {
    shadowColor: C.blue,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  shadowDanger: {
    shadowColor: C.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  body: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PrimaryButton;
