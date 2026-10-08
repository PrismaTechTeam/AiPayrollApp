/**
 * The shared look of the signed-out screens: the flat light page, and the few pieces every one of those forms is built from — the
 * compact header, the card, the labelled field with its own error line, the
 * notice box, the "New here? Create account" row, and the hook that keeps the
 * focused field above the keyboard.
 *
 * One file because Login, Register, Reset password and the join form sit next to
 * each other in the same flow, so a tweak that lands on one and not the others
 * is immediately visible as a seam.
 */
import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Platform,
  type LayoutChangeEvent,
  type ScrollView,
  type TextInputProps,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/** Shared palette for the signed-out screens. */
export const AUTH_COLORS = {
  ink: '#0F2557',     // SayangHR navy
  body: '#64748B',
  muted: '#94A3B8',
  blue: '#0A6CF0',    // SayangHR blue
  blueDeep: '#0857C4',
  blueLight: '#4C93FF',
  blueSoft: '#E6EEFF',
  line: '#E4EBF5',
  field: '#F8FAFD',
  page: '#F6F8FF',
  coral: '#F2496A',   // SayangHR coral: the "HR" in the logo, accents only
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerLine: '#FECACA',
} as const;

/** SayangHR logo (people + heart + wordmark) and the mark alone. */
export const SAYANGHR_LOGO = require('../../../assets/brand/sayanghr-logo.png');
export const SAYANGHR_MARK = require('../../../assets/brand/sayanghr-mark.png');

/**
 * One look for every service tile and row icon (Home, All services): a navy line icon on the
 * soft blue wash. Each service used to have its own pastel (violet, amber, green, sky...), which
 * read as a toy box rather than the flat SaaS look the brief asks for; the icon alone tells the
 * services apart, and blue itself stays reserved for buttons and the active state.
 */
export const SERVICE_TILE = { tint: AUTH_COLORS.ink, bg: AUTH_COLORS.blueSoft } as const;

const C = AUTH_COLORS;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  /**
   * Handwritten lines over the backdrop. No screen uses them any more — they
   * took space the forms needed — but every page passes `[]`, so the prop stays.
   */
  scriptLines?: string[];
  /** Vertical offset for the script block, so it clears each screen's own header. */
  scriptTop?: number;
}

/**
 * One flat page colour. It was a three-stop blue gradient with two 400pt blue
 * washes in the corners, which the owner's brief ("clean white background, flat
 * and lightweight") rules out, and which every account page inherited. The props
 * are still accepted because callers pass them; they draw nothing now.
 */
export const AuthBackdrop: React.FC<Props> = () => (
  <View style={[StyleSheet.absoluteFill, styles.page]} pointerEvents="none" />
);

/**
 * Brand, then one heading and one line under it. The old pages spent a third
 * of the screen here — a 62pt tile, a 33pt wordmark, a tagline, a pitch and then a
 * second "Welcome Back!" heading — and pushed the button under the keyboard.
 *
 * Without `onBack` (the first page someone sees) the stack is centred like an app
 * sign-in, not drawn left-aligned like a website's navbar, which read as amateur.
 * With `onBack` the row is a back arrow instead: the brand was on the page before.
 */
export const AuthHeader: React.FC<{ title: string; subtitle?: string; onBack?: () => void }> = ({
  title,
  subtitle,
  onBack,
}) =>
  onBack ? (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
        </TouchableOpacity>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  ) : (
    <View style={[styles.header, styles.headerCentred]}>
      <Image source={SAYANGHR_LOGO} style={styles.logoImage} resizeMode="contain" accessibilityLabel="SayangHR" />
      <Text style={[styles.title, styles.titleCentred]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={[styles.subtitle, styles.centred]}>{subtitle}</Text> : null}
    </View>
  );

/** The one white card a signed-out form sits in. */
export const AuthCard: React.FC<{ children: React.ReactNode; onLayout?: (e: LayoutChangeEvent) => void }> = ({
  children,
  onLayout,
}) => (
  <View style={styles.card} onLayout={onLayout}>
    {children}
  </View>
);

/**
 * A box at the top of a card for what is not about one field: the server's
 * answer, "your session ended", "link sent".
 */
export const AuthNotice: React.FC<{ message: string | null; tone?: 'error' | 'info' | 'success' }> = ({
  message,
  tone = 'error',
}) => {
  if (!message) return null;
  const look =
    tone === 'error'
      ? { icon: 'alert-circle-outline' as IconName, color: C.danger, box: styles.noticeError }
      : tone === 'success'
        ? { icon: 'check-circle-outline' as IconName, color: '#15803D', box: styles.noticeSuccess }
        : { icon: 'information-outline' as IconName, color: C.body, box: styles.noticeInfo };
  return (
    <View style={[styles.notice, look.box]} accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name={look.icon} size={17} color={look.color} />
      <Text style={[styles.noticeText, { color: look.color }]}>{message}</Text>
    </View>
  );
};

export interface AuthFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  /** Always shown above the frame: a placeholder alone vanishes on the first keystroke. */
  label: string;
  icon?: IconName;
  /** Turns the frame red and says what is wrong right under it, where the person is looking. */
  error?: string | null;
  /** Hides the text, with an eye button to show it. */
  secret?: boolean;
  /** Extra controls inside the frame on the right, e.g. clear and scan buttons. */
  right?: React.ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
}

/** Label + framed input + its own error line. */
export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, icon, error, secret = false, right, onLayout, onFocus, onBlur, editable = true, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const iconColor = error ? C.danger : focused ? C.blue : C.muted;
  return (
    <View style={styles.fieldBlock} onLayout={onLayout}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
          !editable && styles.fieldDisabled,
        ]}
      >
        {icon ? <MaterialCommunityIcons name={icon} size={19} color={iconColor} /> : null}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={C.muted}
          editable={editable}
          secureTextEntry={secret && !revealed}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...input}
        />
        {secret ? (
          // A full 44pt target: the bare 19pt eye was easy to miss with a thumb.
          <TouchableOpacity
            onPress={() => setRevealed((v) => !v)}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          >
            <MaterialCommunityIcons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
          </TouchableOpacity>
        ) : null}
        {right}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
});

/** "New here? Create account" — the quiet way to the other form, a full row tall. */
export const AuthSwitchRow: React.FC<{ prompt: string; action: string; onPress: () => void; disabled?: boolean }> = ({
  prompt,
  action,
  onPress,
  disabled = false,
}) => (
  <TouchableOpacity
    style={styles.switchRow}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={`${prompt} ${action}`}
  >
    <Text style={styles.switchText}>
      {prompt} <Text style={styles.switchAction}>{action}</Text>
    </Text>
  </TouchableOpacity>
);

/**
 * Keeps the field being typed in, and what follows it, above the keyboard.
 *
 * KeyboardAvoidingView shrinks the page to what the keyboard leaves, but a
 * ScrollView does not move by itself to show the focused input, so on a small
 * phone the password field and the button under it stayed below the keyboard.
 * Each field reports where it sits; while the keyboard is up the page scrolls
 * the focused one to the top of what is left. A page that already fits does not
 * move, because a scroll is clamped to the content.
 */
export function useKeepFocusedInView() {
  const scrollRef = useRef<ScrollView>(null);
  const cardTop = useRef(0);
  const offsets = useRef<Record<string, number>>({});
  const focused = useRef<string | null>(null);
  const keyboardUp = useRef(false);

  const reveal = useCallback(() => {
    const name = focused.current;
    if (!name || !keyboardUp.current) return;
    const y = offsets.current[name];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, cardTop.current + y - 12), animated: true });
  }, []);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Android sends no "will" events. The delay lets KeyboardAvoidingView shrink
    // the page first; scrolling before that is clamped to the old height.
    const shown = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      keyboardUp.current = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(reveal, ios ? 300 : 120);
    });
    const hidden = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardUp.current = false;
    });
    return () => {
      if (timer) clearTimeout(timer);
      shown.remove();
      hidden.remove();
    };
  }, [reveal]);

  return {
    scrollRef,
    /** onLayout of the card the fields sit in (a direct child of the scroll content). */
    onCardLayout: useCallback((e: LayoutChangeEvent) => {
      cardTop.current = e.nativeEvent.layout.y;
    }, []),
    /** onLayout of one field inside that card. */
    onFieldLayout: useCallback(
      (name: string) => (e: LayoutChangeEvent) => {
        offsets.current[name] = e.nativeEvent.layout.y;
      },
      [],
    ),
    /** Call from the field's onFocus; moving between fields with the keyboard up scrolls at once. */
    onFieldFocus: useCallback(
      (name: string) => {
        focused.current = name;
        reveal();
      },
      [reveal],
    ),
  };
}

const styles = StyleSheet.create({
  page: { backgroundColor: C.page },

  // Header
  header: { marginBottom: 16 },
  headerCentred: { alignItems: 'center', marginBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginBottom: 14 },
  back: { width: 44, height: 44, marginLeft: -10, justifyContent: 'center', alignItems: 'center' },
  // 894×207 artwork
  logoImage: { width: 172, height: 40 },
  logoTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { marginTop: 8, fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  wordmarkAccent: { color: C.blue },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: C.ink, letterSpacing: -0.4 },
  titleCentred: { marginTop: 18, textAlign: 'center' },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 20, color: C.body },
  centred: { textAlign: 'center' },

  // Card
  // The same white card as the approval cards: hairline border, faint navy shadow.
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  noticeError: { backgroundColor: C.dangerBg, borderColor: C.dangerLine },
  noticeInfo: { backgroundColor: '#F1F5FB', borderColor: C.line },
  noticeSuccess: { backgroundColor: '#ECFDF3', borderColor: '#BBF7D0' },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Field
  fieldBlock: { marginTop: 10 },
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
  fieldError: { borderColor: C.danger, backgroundColor: '#FFFFFF' },
  fieldDisabled: { backgroundColor: '#F1F4F9' },
  // Stretched to the frame's height so a tap anywhere in it lands in the input.
  input: { flex: 1, alignSelf: 'stretch', fontSize: 15, color: C.ink, paddingVertical: 0 },
  eye: { width: 44, height: 44, marginRight: -12, justifyContent: 'center', alignItems: 'center' },
  fieldErrorText: { fontSize: 12, lineHeight: 16, color: C.danger, marginTop: 4, marginLeft: 2 },

  // Switch row
  switchRow: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  switchText: { fontSize: 14, color: C.body, textAlign: 'center' },
  switchAction: { fontWeight: '700', color: C.blue },
});

export default AuthBackdrop;
