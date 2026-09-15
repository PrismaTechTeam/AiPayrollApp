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
 *
 * `prompt` also replaces Alert.prompt, which exists only on iOS — on Android
 * every Alert.prompt call site was silently doing nothing.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (options: NotifyOptions) => Promise<void>;
  /** Resolves with the trimmed text, or null if the person backed out. */
  prompt: (options: PromptOptions) => Promise<string | null>;
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

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<Pending | null>(null);
  const [text, setText] = useState('');
  // Requests made while one is showing wait their turn rather than replacing it.
  const queue = useRef<Pending[]>([]);

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
    }),
    [enqueue],
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
      <Modal visible={current !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => answer(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.backdrop}>
            {/* Tapping outside is the same as the quiet option. */}
            <Pressable style={StyleSheet.absoluteFill} onPress={() => answer(false)} accessibilityLabel="Dismiss" />
            {current ? (
              <View style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
                  <MaterialCommunityIcons name={tone.icon} size={30} color={tone.color} />
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
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
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
  inputMultiline: { minHeight: 96 },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: C.muted, marginTop: 4 },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 14,
  },
  half: { flex: 1 },
});

export default DialogProvider;
