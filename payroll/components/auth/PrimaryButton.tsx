/**
 * The full-width blue button used for the main action on the signed-out and
 * account screens. One component so the shadow, height and disabled look cannot
 * drift between screens.
 *
 * Flat fill, 12pt corners and a faint shadow, to the owner's "flat and
 * lightweight" brief: the blue gradient with its 30% blue glow, 56pt tall, was
 * the most visible sign of the old design on every form.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const height = compact ? 44 : 50;
  // Screen readers hear "busy" while it works and "dimmed" when it cannot be used,
  // instead of a button that silently ignores the tap.
  const a11yState = { disabled: inactive, busy: loading };
  const content = (color: string) => (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon} size={20} color={color} />}
          {/* One line, shrinking before it wraps: labels such as "Open <company name>"
              carry a name of any length. */}
          <Text style={[styles.text, { color }]} numberOfLines={1}>{label}</Text>
        </>
      )}
    </>
  );

  if (variant === 'solid' || variant === 'dangerSolid') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={a11yState}
        style={[styles.wrap, styles.shadow, disabled && styles.disabled]}
      >
        <View style={[styles.body, { height, backgroundColor: variant === 'solid' ? C.blue : C.danger }]}>
          {content('#FFFFFF')}
        </View>
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
      accessibilityLabel={label}
      accessibilityState={a11yState}
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
    borderRadius: 12,
  },
  // Navy, not blue, and faint: a coloured glow under every button read as heavy.
  shadow: {
    shadowColor: C.ink,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  body: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default PrimaryButton;
