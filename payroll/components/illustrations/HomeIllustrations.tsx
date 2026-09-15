/**
 * Flat illustrations for the company home, drawn as vectors so they stay crisp
 * at any density and need no asset files. Both accept a `size` and scale.
 */
import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const SKIN = '#F4C9A6';
const SKIN_DARK = '#E5B48E';
const HAIR = '#1F2A44';
const SHIRT = '#3B7BFF';
const SHIRT_DARK = '#2A62E0';
const NAVY = '#0F1B2D';

/** A person waving from behind an open laptop. */
export const HeroIllustration: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <Svg width={size} height={size} viewBox="0 0 160 160">
    <Defs>
      <LinearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#DCE8FD" />
        <Stop offset="1" stopColor="#F6F8FF" />
      </LinearGradient>
      <LinearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#4C93FF" />
        <Stop offset="1" stopColor="#2F6BFF" />
      </LinearGradient>
    </Defs>

    {/* soft backdrop */}
    <Circle cx="84" cy="82" r="66" fill="url(#glow)" />

    {/* motion strokes near the waving hand */}
    <Path d="M28 62 l10 -4" stroke="#4C93FF" strokeWidth="3" strokeLinecap="round" />
    <Path d="M24 74 l12 0" stroke="#4C93FF" strokeWidth="3" strokeLinecap="round" />
    <Path d="M28 86 l10 4" stroke="#4C93FF" strokeWidth="3" strokeLinecap="round" />

    {/* raised arm + hand */}
    <Path d="M62 108 C52 96 44 84 46 70" stroke={SHIRT} strokeWidth="14" strokeLinecap="round" fill="none" />
    <Circle cx="46" cy="66" r="9" fill={SKIN} />
    <Path d="M40 60 l-2 -8 M45 58 l0 -9 M50 59 l2 -8 M54 63 l4 -6" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />

    {/* torso */}
    <Path d="M56 128 C56 100 72 92 90 92 C108 92 124 100 124 128 Z" fill={SHIRT} />
    <Path d="M84 92 l6 10 l6 -10 Z" fill="#FFFFFF" opacity="0.9" />
    <Path d="M124 128 C124 108 118 98 106 94 L106 128 Z" fill={SHIRT_DARK} opacity="0.35" />

    {/* neck + head */}
    <Rect x="83" y="74" width="14" height="14" rx="5" fill={SKIN_DARK} />
    <Circle cx="90" cy="58" r="24" fill={SKIN} />
    {/* hair */}
    <Path d="M66 56 C66 38 78 30 92 31 C106 32 114 40 114 54 C108 46 100 44 92 46 C84 48 76 48 66 56 Z" fill={HAIR} />
    <Path d="M66 58 C68 50 72 46 76 45 C74 52 72 58 70 64 Z" fill={HAIR} />
    {/* face */}
    <Circle cx="82" cy="60" r="2.4" fill={NAVY} />
    <Circle cx="98" cy="60" r="2.4" fill={NAVY} />
    <Path d="M82 70 Q90 77 98 70" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <Circle cx="76" cy="67" r="3.5" fill="#F3A6A0" opacity="0.6" />
    <Circle cx="104" cy="67" r="3.5" fill="#F3A6A0" opacity="0.6" />

    {/* laptop */}
    <G>
      <Path d="M52 104 h72 a4 4 0 0 1 4 4 v30 h-80 v-30 a4 4 0 0 1 4 -4 Z" fill="#DCE4F0" />
      <Rect x="56" y="110" width="64" height="24" rx="3" fill="url(#screen)" />
      <Rect x="62" y="116" width="22" height="3" rx="1.5" fill="#FFFFFF" opacity="0.8" />
      <Rect x="62" y="123" width="34" height="3" rx="1.5" fill="#FFFFFF" opacity="0.5" />
      <Path d="M36 138 h104 a6 6 0 0 1 -6 8 h-92 a6 6 0 0 1 -6 -8 Z" fill="#C7D3E6" />
      <Rect x="78" y="139" width="20" height="3" rx="1.5" fill="#AFC0DA" />
    </G>
  </Svg>
);

/** A phone with a profile card and two floating feature chips. */
export const PromoIllustration: React.FC<{ size?: number }> = ({ size = 130 }) => (
  <Svg width={size} height={size} viewBox="0 0 130 130">
    <Defs>
      <LinearGradient id="phoneGlow" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="1" stopColor="#F3F7FF" />
      </LinearGradient>
    </Defs>

    {/* shadow */}
    <Ellipse cx="68" cy="118" rx="38" ry="6" fill="#0F1B2D" opacity="0.08" />

    {/* phone */}
    <G rotation="-8" origin="68, 66">
      <Rect x="36" y="14" width="64" height="104" rx="14" fill="#1F2A44" />
      <Rect x="40" y="18" width="56" height="96" rx="11" fill="url(#phoneGlow)" />
      <Rect x="56" y="22" width="24" height="4" rx="2" fill="#1F2A44" opacity="0.5" />
      {/* profile card */}
      <Circle cx="68" cy="50" r="12" fill="#D8E6FB" />
      <Circle cx="68" cy="46" r="4.5" fill="#2F6BFF" />
      <Path d="M60 58 C60 52 76 52 76 58 Z" fill="#2F6BFF" />
      <Rect x="50" y="68" width="36" height="5" rx="2.5" fill="#CBD8EE" />
      <Rect x="56" y="78" width="24" height="5" rx="2.5" fill="#E1E9F6" />
      <Rect x="48" y="92" width="40" height="12" rx="6" fill="#2F6BFF" />
    </G>

    {/* calendar chip */}
    <G>
      <Rect x="4" y="76" width="36" height="36" rx="10" fill="#F1EAFE" />
      <Rect x="12" y="86" width="20" height="18" rx="3" fill="#7C3AED" />
      <Rect x="12" y="86" width="20" height="6" rx="3" fill="#5B21B6" />
      <Rect x="16" y="95" width="4" height="4" rx="1" fill="#FFFFFF" />
      <Rect x="23" y="95" width="4" height="4" rx="1" fill="#FFFFFF" />
    </G>

    {/* document chip */}
    <G>
      <Rect x="90" y="18" width="36" height="36" rx="10" fill="#FFF4E5" />
      <Path d="M101 26 h10 l6 6 v16 a2 2 0 0 1 -2 2 h-14 a2 2 0 0 1 -2 -2 v-20 a2 2 0 0 1 2 -2 Z" fill="#F59E0B" />
      <Rect x="104" y="38" width="10" height="2" rx="1" fill="#FFFFFF" />
      <Rect x="104" y="43" width="7" height="2" rx="1" fill="#FFFFFF" />
    </G>
  </Svg>
);
