/**
 * Building blocks shared by the account pages (menu, profile, password,
 * two-factor): the page frame with its header, the white card, the labelled
 * field, the inline error, and the tappable menu row. One place, so the four
 * pages cannot drift apart.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import type { IconName } from '../auth/PrimaryButton';

/** Backdrop, safe area, back-arrow header and a scrolling body. */
export const AccountPage: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Where the arrow goes. Defaults to the previous screen. */
  onBack?: () => void;
  /** Word next to the arrow, e.g. "Back", for screens reached by a reset rather than a push. */
  backLabel?: string;
}> = ({ title, subtitle, children, onBack, backLabel }) => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onBack ?? (() => navigation.goBack())}
              style={[styles.backButton, backLabel ? styles.backButtonLabelled : null]}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
              {backLabel ? <Text style={styles.backLabel}>{backLabel}</Text> : null}
            </TouchableOpacity>
            {/* Centred on the screen, not between the two sides: a "Back" label
                makes the left side wider than the right, and a title centred
                between them sits visibly off to the right. */}
            <View style={styles.headerText} pointerEvents="none">
              <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export const Card: React.FC<{ children: React.ReactNode; padded?: boolean }> = ({ children, padded = true }) => (
  <View style={[styles.card, padded && styles.cardPadded]}>{children}</View>
);

export const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

/** Bold title with a one-line description under it, above a group of rows. */
export const SectionHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
  </View>
);

/** A row in a menu card: tinted icon, title, optional subtitle, something on the right. */
export const MenuRow: React.FC<{
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  last?: boolean;
}> = ({ icon, title, subtitle, onPress, right, danger = false, last = false }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.row, !last && styles.rowDivider]}
    accessibilityRole="button"
  >
    <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? C.danger : C.blue} />
    </View>
    <View style={styles.flex}>
      <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    {right ?? <MaterialCommunityIcons name="chevron-right" size={24} color={C.muted} />}
  </TouchableOpacity>
);

/** Small status pill, e.g. "On" / "Off" on the two-factor row. */
export const Pill: React.FC<{ on: boolean; onLabel?: string; offLabel?: string }> = ({ on, onLabel = 'On', offLabel = 'Off' }) => (
  <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
    <Text style={[styles.pillText, on ? styles.pillTextOn : styles.pillTextOff]}>{on ? onLabel : offLabel}</Text>
  </View>
);

/** Label + framed input. */
export const Field: React.FC<{
  label: string;
  icon: IconName;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
  secure?: boolean;
  onToggleSecure?: () => void;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'words';
  maxLength?: number;
  note?: string;
  autoFocus?: boolean;
}> = ({ label, icon, value, onChangeText, placeholder, editable = true, secure, onToggleSecure, keyboardType = 'default', autoCapitalize = 'none', maxLength, note, autoFocus }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, !editable && styles.fieldReadOnly]}>
        <MaterialCommunityIcons name={icon} size={20} color={C.muted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          editable={editable}
          secureTextEntry={secure}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          spellCheck={false}
          maxLength={maxLength}
          autoFocus={autoFocus}
        />
        {onToggleSecure && (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>
      {note ? <Text style={styles.fieldNote}>{note}</Text> : null}
    </View>
  );
};

export const ErrorLine: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <View style={styles.errorBox}>
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  ) : null;

/** Title + hint at the top of a form card, with a tinted icon on the left. */
export const CardHeader: React.FC<{ icon: IconName; title: string; hint?: string; right?: React.ReactNode }> = ({ icon, title, hint, right }) => (
  <View style={styles.cardHeader}>
    <View style={styles.rowIcon}>
      <MaterialCommunityIcons name={icon} size={22} color={C.blue} />
    </View>
    <View style={styles.flex}>
      <Text style={styles.cardTitle}>{title}</Text>
      {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
    </View>
    {right}
  </View>
);

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backButtonLabelled: { width: undefined, minWidth: 44, flexDirection: 'row', gap: 4, paddingRight: 6 },
  backLabel: { fontSize: 16, fontWeight: '700', color: C.ink },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 14, color: C.body, marginTop: 2 },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    overflow: 'hidden',
  },
  cardPadded: { padding: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  cardHint: { fontSize: 13, lineHeight: 19, color: C.body, marginTop: 3 },

  sectionHeader: { marginTop: 6, marginBottom: 10, marginLeft: 4 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: C.ink },
  sectionDescription: { fontSize: 14, lineHeight: 20, color: C.body, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 6,
    marginBottom: 8,
    marginTop: 4,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  rowIconDanger: { backgroundColor: C.dangerBg },
  rowTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  rowTitleDanger: { color: C.danger },
  rowSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillOn: { backgroundColor: '#DCFCE7' },
  pillOff: { backgroundColor: '#EEF2F7' },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextOn: { color: '#15803D' },
  pillTextOff: { color: C.body },

  fieldBlock: { marginTop: 10, marginBottom: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.body, marginBottom: 6, marginLeft: 2, letterSpacing: 0.3 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  fieldReadOnly: { backgroundColor: '#F1F4F9' },
  input: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 },
  fieldNote: { fontSize: 12, color: C.muted, marginTop: 5, marginLeft: 2 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.danger },
});
