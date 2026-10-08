/**
 * Building blocks shared by the account pages (menu, profile, password,
 * two-factor): the page frame with its header, the white card, the labelled
 * field, the inline error, and the tappable menu row. One place, so the four
 * pages cannot drift apart.
 *
 * They follow the same look as the HR approval cards: 17/700 centred title,
 * white cards with a 1px line border and a faint shadow, and plain grey line
 * icons. Blue is kept for buttons and the active state, so it still means
 * "tap here" when it shows up.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import PrimaryButton, { type IconName } from '../auth/PrimaryButton';
import { useDialog } from '../ui/AppDialog';
import { usePayrollAuth, getDeviceId } from '../../context/PayrollAuthContext';
import profileService from '../../api/services/profileService';
import { accountErrorMessage } from '../../api/services/accountService';

/** Backdrop, safe area, back-arrow header and a scrolling body. */
export const AccountPage: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Where the arrow goes. Defaults to the previous screen. */
  onBack?: () => void;
  /** Word next to the arrow, e.g. "Back", for screens reached by a reset rather than a push. */
  backLabel?: string;
  /** No arrow at all: the page is a tab of the bottom bar, which is how you leave it. */
  hideBack?: boolean;
  /**
   * Pinned over the bottom of the page, e.g. the bottom bar. It sits outside
   * the safe area because it pads itself for the home indicator.
   */
  footer?: React.ReactNode;
  /** Space kept free under the content so the footer never covers the last row. */
  footerHeight?: number;
}> = ({ title, subtitle, children, onBack, backLabel, hideBack = false, footer, footerHeight = 0 }) => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />
      <SafeAreaView style={styles.flex} edges={footer ? ['top'] : ['top', 'bottom']}>
        {/* "padding" on Android too. The app draws edge to edge, and in that mode
            Android no longer shrinks the window for the keyboard, so leaving the
            behaviour undefined let the keyboard sit over the field being typed in
            and the button under it. The padding is the keyboard's overlap with
            this view, so a window that does get resized simply gets none. */}
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <View style={styles.header}>
            {hideBack ? null : (
              <TouchableOpacity
                onPress={onBack ?? (() => navigation.goBack())}
                style={[styles.backButton, backLabel ? styles.backButtonLabelled : null]}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
                {backLabel ? <Text style={styles.backLabel}>{backLabel}</Text> : null}
              </TouchableOpacity>
            )}
            {/* Centred on the screen, not between the two sides: a "Back" label
                makes the left side wider than the right, and a title centred
                between them sits visibly off to the right. */}
            <View style={[styles.headerText, backLabel ? styles.headerTextWide : null]} pointerEvents="none">
              <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          </View>
          <ScrollView
            contentContainerStyle={[styles.scroll, footerHeight ? { paddingBottom: footerHeight } : null]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {footer}
    </View>
  );
};

/**
 * Two layers because one view cannot both clip and cast a shadow on iOS:
 * overflow 'hidden' turns on masksToBounds, which cut the shadow off and left
 * every card flat on an iPhone while Android drew its elevation. The outer
 * view carries the shadow, the inner one clips the rows to the corners.
 */
export const Card: React.FC<{ children: React.ReactNode; padded?: boolean }> = ({ children, padded = true }) => (
  <View style={styles.card}>
    <View style={[styles.cardInner, padded && styles.cardPadded]}>{children}</View>
  </View>
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

/** A row in a menu card: line icon, title, optional subtitle, something on the right. */
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
    accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
  >
    <View style={styles.rowIcon}>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? C.danger : C.body} />
    </View>
    <View style={styles.flex}>
      <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    {right ?? <MaterialCommunityIcons name="chevron-right" size={22} color={C.muted} />}
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
  /**
   * What the field holds, so each platform can help: saved-password autofill
   * for the current password, a suggested one for a new password, and the
   * one-time code from a text or an authenticator for a verification field.
   */
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  inputRef?: React.Ref<TextInput>;
}> = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  editable = true,
  secure,
  onToggleSecure,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  note,
  autoFocus,
  textContentType,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, !editable && styles.fieldReadOnly]}>
        <MaterialCommunityIcons name={icon} size={20} color={focused ? C.blue : C.muted} />
        <TextInput
          ref={inputRef}
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
          textContentType={textContentType}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
        />
        {onToggleSecure && (
          // A full 44pt target: the bare 20pt eye was easy to miss with a thumb.
          <TouchableOpacity
            onPress={onToggleSecure}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={secure ? `Show ${label.toLowerCase()}` : `Hide ${label.toLowerCase()}`}
          >
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
    <View style={styles.errorBox} accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  ) : null;

/**
 * A request that failed, said as such, with a way to ask again. Kept apart
 * from the empty state on purpose: "could not load" and "there is nothing"
 * need different next steps, and showing both at once told people both.
 */
export const LoadFailed: React.FC<{ title: string; message?: string | null; onRetry: () => void; busy?: boolean }> = ({
  title,
  message,
  onRetry,
  busy = false,
}) => (
  <Card>
    <View style={styles.failed}>
      <MaterialCommunityIcons name="cloud-alert-outline" size={28} color={C.danger} />
      <Text style={styles.failedTitle}>{title}</Text>
      {message ? <Text style={styles.failedBody}>{message}</Text> : null}
    </View>
    <PrimaryButton icon="refresh" label="Try again" onPress={onRetry} loading={busy} variant="outline" compact />
  </Card>
);

/** Title + hint at the top of a form card, with a line icon on the left. */
export const CardHeader: React.FC<{ icon: IconName; title: string; hint?: string; right?: React.ReactNode }> = ({ icon, title, hint, right }) => (
  <View style={styles.cardHeader}>
    <View style={styles.rowIcon}>
      <MaterialCommunityIcons name={icon} size={22} color={C.body} />
    </View>
    <View style={styles.flex}>
      <Text style={styles.cardTitle}>{title}</Text>
      {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
    </View>
    {right}
  </View>
);

/**
 * Ends every session of the account (every phone and browser, this one too),
 * then signs this phone out. For someone who lost a phone, or changed a
 * password that leaked: an HR phone left signed in can still approve.
 *
 * Its own action, not what Sign Out does: the reworked server ends only this
 * phone's session on an ordinary sign-out, so ending the others has to be
 * asked for by name. If the request fails nothing is cleared here, because
 * signing this phone out anyway would look like success while the lost phone
 * stayed signed in. The caller asks for confirmation first.
 */
export function useSignOutEverywhere(): { busy: boolean; signOutEverywhere: () => Promise<void> } {
  const { logout } = usePayrollAuth();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const signOutEverywhere = useCallback(async () => {
    setBusy(true);
    try {
      await profileService.signOutEverywhere(await getDeviceId());
    } catch (err) {
      setBusy(false);
      await dialog.notify({
        title: 'Could not sign out everywhere',
        message: accountErrorMessage(err, 'Check your connection and try again.'),
        tone: 'danger',
      });
      return;
    }
    // This phone last: logout() takes the app back to sign-in, which unmounts the caller.
    await logout();
  }, [dialog, logout]);
  return { busy, signOutEverywhere };
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 4 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backButtonLabelled: { width: undefined, minWidth: 44, flexDirection: 'row', gap: 4, paddingRight: 6 },
  backLabel: { fontSize: 16, fontWeight: '700', color: C.ink },
  // Wide enough for the arrow on each side and no more, so a title like
  // "Notification Devices" is not cut short on a 360pt Android phone.
  headerText: { position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTextWide: { left: 88, right: 88 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.body, marginTop: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    // A faint ink shadow plus the border, the same as the approval cards; the
    // old blue glow made these pages look heavier than the lists beside them.
    shadowColor: C.ink,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardInner: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  cardPadded: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  cardHint: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 2 },

  sectionHeader: { marginTop: 4, marginBottom: 8, marginLeft: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  sectionDescription: { fontSize: 13, lineHeight: 18, color: C.body, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.body,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginLeft: 6,
    marginBottom: 6,
    marginTop: 4,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 54 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  // A bare line icon, no tinted disc: 10pt narrower, which is what lets "Two-Factor
  // Authentication" and its On/Off pill share a row on a 360pt Android phone.
  rowIcon: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
  rowTitleDanger: { color: C.danger },
  rowSubtitle: { fontSize: 12, color: C.body, marginTop: 1 },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillOn: { backgroundColor: '#DCFCE7' },
  pillOff: { backgroundColor: '#EEF2F7' },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextOn: { color: '#15803D' },
  pillTextOff: { color: C.body },

  fieldBlock: { marginTop: 8, marginBottom: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.body, marginBottom: 5, marginLeft: 2, letterSpacing: 0.3 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  fieldReadOnly: { backgroundColor: '#F1F4F9' },
  input: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 },
  eyeButton: { width: 44, height: 44, marginRight: -12, justifyContent: 'center', alignItems: 'center' },
  fieldNote: { fontSize: 12, color: C.muted, marginTop: 4, marginLeft: 2 },

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

  failed: { alignItems: 'center', gap: 6, paddingBottom: 12 },
  failedTitle: { fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 4 },
  failedBody: { fontSize: 13, lineHeight: 18, color: C.body, textAlign: 'center' },
});
