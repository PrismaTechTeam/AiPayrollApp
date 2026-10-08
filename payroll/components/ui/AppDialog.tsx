/**
 * The app's own dialog, in place of the platform Alert.
 *
 * Alert.alert draws the OS box — grey, system font, teal capitals on Android —
 * which looks like a different product dropped into the middle of ours. This
 * renders the same card language as every other screen and gives call sites a
 * promise instead of callback arrays:
 *
 *   const ok = await dialog.confirm({ title: 'Sign out?', destructive: true });
 *   await dialog.notify({ title: 'Saved', tone: 'success' });
 *   const reason = await dialog.prompt({ title: 'Reason for rejection', required: true });
 *   dialog.toast('Approved – Aisyah', 'success');
 *
 * `prompt` also replaces Alert.prompt, which exists only on iOS — on Android
 * every Alert.prompt call site was silently doing nothing.
 *
 * `toast` is the one confirmation that needs no tap: a white pill near the bottom
 * that goes by itself. The three approval lists each drew their own (a dark bar,
 * a banner at the top, a white pill), so the same Approve said "done" three ways.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AUTH_COLORS as C } from '../auth/AuthBackdrop';
import PrimaryButton, { IconName } from '../auth/PrimaryButton';

export type DialogTone = 'info' | 'success' | 'warning' | 'danger';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button for actions that remove or end something. */
  destructive?: boolean;
  tone?: DialogTone;
}

export interface NotifyOptions {
  title: string;
  message?: string;
  buttonText?: string;
  tone?: DialogTone;
}

export interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  /** Pre-filled text, for editing something that already exists. */
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  /** Blocks the confirm button until something non-blank is typed. */
  required?: boolean;
  maxLength?: number;
  multiline?: boolean;
  destructive?: boolean;
  tone?: DialogTone;
}

export interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (options: NotifyOptions) => Promise<void>;
  /** Resolves with the trimmed text, or null if the person backed out. */
  prompt: (options: PromptOptions) => Promise<string | null>;
  /**
   * A short line that clears itself after a moment. Never queued behind the dialogs: it
   * says something already happened, so it shows at once, and a newer one replaces it.
   */
  toast: (message: string, tone?: DialogTone) => void;
}

/** How long a toast stays up. Long enough to read a name, short enough not to linger. */
const TOAST_MS = 2500;

/**
 * Room the bottom tab bar takes, so a toast sits above it rather than over it. The provider
 * wraps the navigator and cannot see which screen is showing, so the bar itself says so while
 * its screen is focused (holdToastClearance) and takes it back when it is not. The owner check
 * means the screen being left cannot clear what the screen being opened just set. A toast
 * shown on a details page often outlives it (the page goes back as the decision lands), so the
 * provider follows the change and lifts the toast above the list's bar.
 */
let clearance: { owner: object; space: number } | null = null;
const clearanceListeners = new Set<() => void>();

export function holdToastClearance(owner: object, space: number): void {
  clearance = { owner, space };
  clearanceListeners.forEach((notify) => notify());
}

export function releaseToastClearance(owner: object): void {
  if (clearance?.owner !== owner) return;
  clearance = null;
  clearanceListeners.forEach((notify) => notify());
}

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'notify'; options: NotifyOptions; resolve: () => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

const TONES: Record<DialogTone, { icon: IconName; color: string; bg: string }> = {
  info: { icon: 'information-outline', color: C.blue, bg: '#E6EEFF' },
  success: { icon: 'check-circle-outline', color: '#16A34A', bg: '#E7F7EE' },
  warning: { icon: 'alert-outline', color: '#D97706', bg: '#FFF4E5' },
  danger: { icon: 'alert-circle-outline', color: C.danger, bg: C.dangerBg },
};

const DialogContext = createContext<DialogApi | null>(null);

type Toast = { id: number; message: string; tone: DialogTone };

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Pending | null>(null);
  const [text, setText] = useState('');
  // Requests made while one is showing wait their turn rather than replacing it.
  const queue = useRef<Pending[]>([]);
  const [toastShown, setToastShown] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastSeq = useRef(0);
  const [barSpace, setBarSpace] = useState(() => clearance?.space ?? 0);

  useEffect(() => {
    const notify = () => setBarSpace(clearance?.space ?? 0);
    clearanceListeners.add(notify);
    notify();
    return () => {
      clearanceListeners.delete(notify);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback(
    (message: string, tone: DialogTone = 'success') => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastSeq.current += 1;
      const id = toastSeq.current;
      setToastShown({ id, message, tone });
      toastOpacity.setValue(0);
      Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      // accessibilityLiveRegion covers Android; iOS needs to be told.
      AccessibilityInfo.announceForAccessibility(message);
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
          // Only this toast: a newer one that arrived during the fade stays up.
          setToastShown((shown) => (shown && shown.id === id ? null : shown));
        });
      }, TOAST_MS);
    },
    [toastOpacity],
  );

  const enqueue = useCallback((item: Pending) => {
    setCurrent((showing) => {
      if (showing) {
        queue.current.push(item);
        return showing;
      }
      return item;
    });
  }, []);

  // Seed the field whenever a prompt becomes the one on screen, including when
  // it was queued behind another dialog.
  useEffect(() => {
    if (current?.kind === 'prompt') setText(current.options.initialValue ?? '');
  }, [current]);

  const finish = useCallback(() => {
    setCurrent(queue.current.shift() ?? null);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) => new Promise<boolean>((resolve) => enqueue({ kind: 'confirm', options, resolve })),
      notify: (options) => new Promise<void>((resolve) => enqueue({ kind: 'notify', options, resolve })),
      prompt: (options) => new Promise<string | null>((resolve) => enqueue({ kind: 'prompt', options, resolve })),
      toast: showToast,
    }),
    [enqueue, showToast],
  );

  const tone = current
    ? TONES[current.options.tone ?? (current.kind !== 'notify' && current.options.destructive ? 'danger' : 'info')]
    : TONES.info;

  const answer = (ok: boolean) => {
    if (!current) return;
    if (current.kind === 'confirm') current.resolve(ok);
    else if (current.kind === 'prompt') current.resolve(ok ? text.trim() : null);
    else current.resolve();
    setText('');
    finish();
  };

  const promptReady =
    current?.kind !== 'prompt' || !current.options.required || text.trim().length > 0;

  const maxLength = current?.kind === 'prompt' ? current.options.maxLength : undefined;

  return (
    <DialogContext.Provider value={api}>
      {children}
      {toastShown ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toastWrap, { bottom: (barSpace > 0 ? barSpace : insets.bottom) + 16, opacity: toastOpacity }]}
        >
          <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <MaterialCommunityIcons name={TONES[toastShown.tone].icon} size={18} color={TONES[toastShown.tone].color} />
            <Text style={styles.toastText} numberOfLines={2} maxFontSizeMultiplier={1.3}>
              {toastShown.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
      <Modal visible={current !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => answer(false)}>
        {/* "padding" on Android too. This modal is drawn edge to edge, so the window
            never shrinks for the keyboard on its own, and the Reject or Send button of
            a prompt sat under it. The padding is the keyboard's actual overlap, so a
            window that does get resized simply gets none. */}
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <View style={styles.backdrop}>
            {/* Tapping outside is the same as the quiet option. */}
            <Pressable style={StyleSheet.absoluteFill} onPress={() => answer(false)} accessibilityLabel="Dismiss" />
            {current ? (
              <View style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
                  <MaterialCommunityIcons name={tone.icon} size={24} color={tone.color} />
                </View>
                <Text style={styles.title}>{current.options.title}</Text>
                {current.options.message ? <Text style={styles.message}>{current.options.message}</Text> : null}

                {current.kind === 'prompt' ? (
                  <View style={styles.inputBlock}>
                    <TextInput
                      style={[styles.input, current.options.multiline && styles.inputMultiline]}
                      value={text}
                      onChangeText={setText}
                      placeholder={current.options.placeholder}
                      placeholderTextColor={C.muted}
                      multiline={current.options.multiline}
                      maxLength={maxLength}
                      autoFocus
                      textAlignVertical={current.options.multiline ? 'top' : 'center'}
                    />
                    {maxLength ? (
                      <Text style={styles.counter}>
                        {text.length}/{maxLength}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {current.kind === 'notify' ? (
                  <PrimaryButton label={current.options.buttonText ?? 'OK'} onPress={() => answer(true)} compact />
                ) : (
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <PrimaryButton label={current.options.cancelText ?? 'Cancel'} onPress={() => answer(false)} variant="outline" compact />
                    </View>
                    <View style={styles.half}>
                      <PrimaryButton
                        label={current.options.confirmText ?? 'Confirm'}
                        onPress={() => answer(true)}
                        variant={current.options.destructive ? 'dangerSolid' : 'solid'}
                        disabled={!promptReady}
                        compact
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </DialogContext.Provider>
  );
};

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used within DialogProvider');
  return api;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,45,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  // Small enough that a prompt (icon, title, field, buttons) still fits above the
  // keyboard on a short phone.
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: C.body,
    textAlign: 'center',
    marginBottom: 6,
  },
  inputBlock: { width: '100%', marginTop: 10 },
  input: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
  },
  inputMultiline: { minHeight: 72 },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: C.muted, marginTop: 4 },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 14,
  },
  half: { flex: 1 },

  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  toastText: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: C.ink },
});

export default DialogProvider;
