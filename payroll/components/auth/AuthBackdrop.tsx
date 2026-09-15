/**
 * The shared look of the signed-out screens: a light gradient with two tinted corner
 * washes, an optional ID-card illustration, and a handwritten line.
 *
 * Extracted from LoginScreen when Register was given the same treatment — the two
 * screens sit next to each other in the same flow, so a tweak that lands on one and
 * not the other is immediately visible as a seam.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** Shared palette for the signed-out screens. */
export const AUTH_COLORS = {
  ink: '#0F1B2D',
  body: '#64748B',
  muted: '#94A3B8',
  blue: '#2F6BFF',
  blueDeep: '#1D5DF0',
  blueLight: '#4C93FF',
  line: '#E4EBF5',
  field: '#F8FAFD',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerLine: '#FECACA',
} as const;

interface Props {
  /** The handwritten lines, top to bottom. */
  scriptLines: string[];
  /** Vertical offset for the script block, so it clears each screen's own header. */
  scriptTop?: number;
  /** The little ID card. Login shows it; Register does not — its header is taller. */
  showIdCard?: boolean;
}

export const AuthBackdrop: React.FC<Props> = ({
  scriptLines,
  scriptTop = 176,
  showIdCard = false,
}) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <LinearGradient
      colors={['#EEF4FF', '#FAFCFF', '#F0F5FF']}
      locations={[0, 0.45, 1]}
      style={StyleSheet.absoluteFill}
    />

    {/* Tinted corner washes. Each is a circle filled with a gradient that fades to
        fully transparent, so the side facing the page has no visible rim — a flat
        fill leaves a hard arc across the middle of the screen. */}
    <LinearGradient
      colors={['rgba(47,107,255,0.10)', 'rgba(47,107,255,0)']}
      start={{ x: 0.85, y: 0.1 }}
      end={{ x: 0.15, y: 0.9 }}
      style={styles.blobTop}
    />
    <LinearGradient
      colors={['rgba(47,107,255,0.08)', 'rgba(47,107,255,0)']}
      start={{ x: 0.15, y: 0.9 }}
      end={{ x: 0.85, y: 0.1 }}
      style={styles.blobBottom}
    />

    {showIdCard && (
      <View style={styles.idCard}>
        <View style={styles.idAvatar} />
        <View style={[styles.idLine, { width: 46 }]} />
        <View style={[styles.idLine, { width: 34 }]} />
        <View style={[styles.idLine, { width: 40 }]} />
      </View>
    )}

    {/* Screens that only want the wash pass no lines; the underline alone would
        look like a stray mark. */}
    {scriptLines.length > 0 && (
      <View style={[styles.script, { top: scriptTop }]}>
        {scriptLines.map((line) => (
          <Text key={line} style={styles.scriptText}>
            {line}
          </Text>
        ))}
        <View style={styles.scriptUnderline} />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  blobTop: {
    position: 'absolute',
    top: -190,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -220,
    left: -180,
    width: 430,
    height: 430,
    borderRadius: 215,
  },
  idCard: {
    position: 'absolute',
    top: 74,
    right: 16,
    width: 136,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingTop: 14,
    paddingLeft: 14,
    transform: [{ rotate: '-9deg' }],
    shadowColor: '#2F6BFF',
    shadowOpacity: 0.13,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  idAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D8E6FB',
    marginBottom: 9,
  },
  idLine: { height: 5, borderRadius: 3, backgroundColor: '#E8EEF7', marginBottom: 6 },
  script: {
    position: 'absolute',
    right: 30,
    alignItems: 'flex-start',
    transform: [{ rotate: '-7deg' }],
  },
  scriptText: {
    fontSize: 17,
    lineHeight: 21,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#A9C4F0',
    letterSpacing: 0.3,
  },
  scriptUnderline: {
    marginTop: 4,
    width: 62,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#BFD5F5',
    transform: [{ rotate: '3deg' }],
  },
});

export default AuthBackdrop;
