/**
 * The parts every approval card is built from: Leave, Request and Claim Approval, and their
 * details pages.
 *
 * The three lists were written by three hands and drifted in the small things: three avatar
 * washes, buttons at 600 on one list and 700 on the others, a type row 10pt down on one and
 * 12pt on another. The owner reads them side by side, so one module now owns the surface, the
 * person row and the Reject / Approve pair, and each list only adds what is its own (the dates
 * of a leave, the amount of a claim, the note on a request).
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';

/** The white card of the HR design language: radius 16, a 1px line border, a shadow you barely see. */
export const APPROVAL_CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.line,
  shadowColor: C.ink,
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

/** The wash behind an approval card's initials. Neutral: blue is kept for buttons and the active tab. */
export const APPROVAL_AVATAR_BG = '#EEF3FB';

/**
 * Initials discs take a colour per person (from the name, so it never changes), on the owner's
 * 2026-10-08 design: in a queue of grey discs the rows ran together. Home's Waiting list uses
 * the same tones, so a person looks the same on Home and on the list.
 */
const AVATAR_TONES = [
  { bg: '#EAF1FF', fg: '#2F6BFF' },
  { bg: '#F1EDFF', fg: '#6D28D9' },
  { bg: '#FFF1E6', fg: '#EA580C' },
  { bg: '#E8F7EE', fg: '#15803D' },
  { bg: '#E6F6F6', fg: '#0F766E' },
] as const;

export function avatarTone(name?: string | null): { bg: string; fg: string } {
  const s = name ?? '';
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** Two letters for an avatar disc: a face is not available on these screens, a name always is. */
export function personInitials(name?: string | null): string {
  const letters = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return letters || '?';
}

/**
 * Row 1 of the card: a 40pt initials disc, the name on one line (with "(you)" on the viewer's
 * own item), the employee code under it, and whatever the list puts on the right (the status
 * badge, off the Pending tab).
 */
export const ApprovalPerson: React.FC<{
  name: string;
  /** Employee code, and anything else short a list wants under the name (a department). */
  code?: string | null;
  own?: boolean;
  right?: React.ReactNode;
}> = ({ name, code, own = false, right }) => {
  const tone = avatarTone(name);
  return (
  <View style={styles.person}>
    <View style={[styles.avatar, { backgroundColor: tone.bg }, own && styles.avatarOwn]}>
      <Text style={[styles.avatarText, { color: own ? C.ink : tone.fg }]} maxFontSizeMultiplier={1.2}>{personInitials(name)}</Text>
    </View>
    <View style={styles.personText}>
      <Text style={styles.name} numberOfLines={1}>
        {name}
        {own ? <Text style={styles.you}>  (you)</Text> : null}
      </Text>
      {code ? <Text style={styles.code} numberOfLines={1}>{code}</Text> : null}
    </View>
    {right ?? null}
  </View>
  );
};

export interface DecisionButtonsProps {
  onReject: () => void;
  onApprove: () => void;
  acting: 'approve' | 'reject' | null;
  disabled?: boolean;
  /** For a screen reader: whose item the buttons decide. */
  name?: string;
  /** What is being decided, for the same label: "leave", "claim", "Equipment request". */
  subject?: string;
}

/**
 * Reject and Approve, side by side: the same two buttons on every list and every details page,
 * so one decision looks the same wherever it is made. Only the pressed button spins; both are
 * held while any decision is in flight.
 */
export const DecisionButtons: React.FC<DecisionButtonsProps> = ({
  onReject,
  onApprove,
  acting,
  disabled = false,
  name,
  subject = 'application',
}) => {
  const off = disabled || acting !== null;
  const whose = name ? `${name}'s ${subject}` : null;
  return (
    <View style={styles.decide}>
      <TouchableOpacity
        style={[styles.decideBtn, styles.decideReject, off && acting !== 'reject' && styles.decideOff]}
        onPress={onReject}
        disabled={off}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={whose ? `Reject ${whose}` : 'Reject'}
        accessibilityState={{ disabled: off, busy: acting === 'reject' }}
      >
        {acting === 'reject' ? (
          <ActivityIndicator size="small" color={C.danger} />
        ) : (
          <>
            <MaterialCommunityIcons name="close" size={18} color={C.danger} />
            <Text style={[styles.decideText, { color: C.danger }]} maxFontSizeMultiplier={1.3}>Reject</Text>
          </>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.decideBtn, styles.decideApprove, off && acting !== 'approve' && styles.decideOff]}
        onPress={onApprove}
        disabled={off}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={whose ? `Approve ${whose}` : 'Approve'}
        accessibilityState={{ disabled: off, busy: acting === 'approve' }}
      >
        {acting === 'approve' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
            <Text style={[styles.decideText, { color: '#FFFFFF' }]} maxFontSizeMultiplier={1.3}>Approve</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

/** One full-width undo action (withdraw, cancel): white, danger outline, the same height as the decision pair. */
export const DangerOutlineButton: React.FC<{
  label: string;
  icon: IconName;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}> = ({ label, icon, onPress, busy = false, disabled = false }) => (
  <TouchableOpacity
    style={[styles.decideBtn, styles.outlineDanger, disabled && !busy && styles.decideOff]}
    onPress={onPress}
    disabled={disabled || busy}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: disabled || busy, busy }}
  >
    {busy ? (
      <ActivityIndicator size="small" color={C.danger} />
    ) : (
      <>
        <MaterialCommunityIcons name={icon} size={16} color={C.danger} />
        <Text style={[styles.decideText, { color: C.danger }]} maxFontSizeMultiplier={1.3}>{label}</Text>
      </>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: APPROVAL_AVATAR_BG, alignItems: 'center', justifyContent: 'center' },
  // The viewer's own item reads as theirs at a glance, before the "(you)".
  avatarOwn: { backgroundColor: '#EEF2F7' },
  avatarText: { fontSize: 16, fontWeight: '700', color: C.ink },
  personText: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '700', color: C.ink },
  you: { fontSize: 13, fontWeight: '600', color: C.muted },
  code: { fontSize: 13, color: C.muted, marginTop: 2 },

  decide: { flexDirection: 'row', gap: 10 },
  decideBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 12 },
  // A soft red fill, no outline (2026-10-08 design): the red outline looked like an error box.
  decideReject: { backgroundColor: '#FDECEC' },
  // Withdraw / cancel keep the outline: they undo the reader's own item, not decide someone else's.
  outlineDanger: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.danger },
  decideApprove: { backgroundColor: C.blue },
  decideOff: { opacity: 0.5 },
  decideText: { fontSize: 15, fontWeight: '700' },
});
