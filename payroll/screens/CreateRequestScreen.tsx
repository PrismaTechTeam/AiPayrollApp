/**
 * New Request
 * Pick a type, say what you need, attach anything that supports it, send.
 *
 * Files are held on the phone until the request exists, then uploaded to it —
 * there is nothing to attach them to before that. If a file fails to upload the
 * request still stands, and the person is told exactly which one to add again
 * from the detail screen.
 *
 * There is no "Save as draft". A draft could never be sent, edited or cancelled
 * afterwards — no endpoint does any of those to one — so the button only made
 * requests HR never saw.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { FieldError } from '../components/leave/LeaveUi';
import { useDialog } from '../components/ui/AppDialog';
import requestService, { RequestType } from '../api/services/requestService';
import {
  pickFile,
  rejectionReason,
  formatBytes,
  iconForFile,
  MAX_FILES_PER_SIDE,
  type PickedFile,
  type PickSource,
} from '../lib/requestAttachments';
import { serverMessage } from '../lib/serverMessage';
import {
  AttachButton,
  PickSourceSheet,
  RequestHeader,
  RequestSheet,
  useKeyboardVisible,
} from '../components/requests/RequestUi';

/** The server upper-cases every short code, so "Other" arrives as OTHER. */
const OTHER_CODE = 'OTHER';
const NOTE_LIMIT = 2000;

type FieldErrors = { type?: string; other?: string; notes?: string };

export const CreateRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();

  const [types, setTypes] = useState<RequestType[] | null>(null);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RequestType | null>(null);
  const [otherText, setOtherText] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<PickedFile[]>([]);

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'other' | 'notes' | null>(null);

  // State updates land a frame late; two quick taps on Send would both see
  // `submitting` as false and create the request twice.
  const sendingRef = useRef(false);

  const isOther = (selected?.key ?? '').toUpperCase() === OTHER_CODE;

  const loadTypes = useCallback(async () => {
    setTypes(null);
    setTypesError(null);
    try {
      setTypes(await requestService.getTypes());
    } catch (err) {
      // Kept apart from "none set up": a failed call is not an empty list, and
      // telling someone to ask HR to add types when the network dropped sends
      // them to the wrong person.
      setTypes([]);
      setTypesError(serverMessage(err, 'Could not load the request types.'));
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const openTypePicker = () => {
    if (typesError) {
      void loadTypes();
      return;
    }
    setTypePickerOpen(true);
  };

  const addFile = async (source: PickSource) => {
    if (pending.length >= MAX_FILES_PER_SIDE) {
      await dialog.notify({
        title: 'That is enough files',
        message: `You can attach up to ${MAX_FILES_PER_SIDE} files.`,
        tone: 'warning',
      });
      return;
    }

    let picked: PickedFile | null;
    try {
      picked = await pickFile(source);
    } catch (err) {
      await dialog.notify({ title: 'Cannot open the picker', message: serverMessage(err, 'Please try again.'), tone: 'warning' });
      return;
    }
    if (!picked) return;
    const file = picked;

    const why = rejectionReason(file);
    if (why) {
      await dialog.notify({ title: 'That file cannot be attached', message: why, tone: 'warning' });
      return;
    }

    // Two picks of the same photo would upload it twice.
    if (pending.some((f) => f.uri === file.uri)) {
      await dialog.notify({ title: 'Already attached', message: file.name, tone: 'info' });
      return;
    }

    setPending((prev) => [...prev, file]);
  };

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    if (!selected) found.type = 'Choose what kind of request this is.';
    else if (isOther && !otherText.trim()) found.other = 'Say what kind of request this is.';
    if (!notes.trim()) found.notes = 'Add a note so HR knows what you need.';
    return found;
  };

  const submit = async () => {
    if (sendingRef.current) return;
    const found = validate();
    setFieldErrors(found);
    if (Object.keys(found).length > 0 || !selected) return;

    sendingRef.current = true;
    setSendError(null);
    setSubmitting(true);

    try {
      // "Other" goes by the words the employee typed: linking it by id would
      // make the server name it after the type and drop what they wrote.
      const created = await requestService.createApplication(
        isOther
          ? { requestType: otherText.trim(), notes: notes.trim() }
          : { requestTypeId: selected.id || undefined, requestType: selected.label || selected.key, notes: notes.trim() },
      );

      // The request exists now; anything that fails from here is about the files.
      const failed: string[] = [];
      for (const file of pending) {
        try {
          await requestService.uploadAttachment(created.id, file);
        } catch {
          failed.push(file.name);
        }
      }

      if (failed.length > 0) {
        await dialog.notify({
          title: 'Sent, but some files did not attach',
          message: `${failed.join(', ')} could not be uploaded. Open the request in My Requests to add them again.`,
          tone: 'warning',
        });
      } else {
        await dialog.notify({
          title: 'Request sent',
          message: 'HR will review it. You can follow it in My Requests.',
          tone: 'success',
        });
      }
      navigation.goBack();
    } catch (err) {
      setSendError(serverMessage(err, 'Could not send the request. Please try again.'));
    } finally {
      sendingRef.current = false;
      setSubmitting(false);
    }
  };

  const typeFieldText = types === null
    ? 'Loading types…'
    : typesError
      ? 'Could not load types. Tap to try again.'
      : selected?.label || 'Choose a type';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        {/* "padding" on both platforms: Android runs edge to edge, so the window
            no longer shrinks for the keyboard and the Send button would sit under it. */}
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <RequestHeader title="New Request" onBack={() => navigation.goBack()} />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* What and why */}
            <View style={styles.card}>
              <Text style={styles.label}>Request type</Text>
              <TouchableOpacity
                style={[
                  styles.field,
                  typePickerOpen && styles.fieldFocused,
                  (fieldErrors.type || typesError) && styles.fieldInvalid,
                ]}
                onPress={openTypePicker}
                disabled={types === null}
                accessibilityRole="button"
                accessibilityLabel={typeFieldText}
              >
                <MaterialCommunityIcons
                  name={typesError ? 'refresh' : 'format-list-bulleted-type'}
                  size={20}
                  color={typesError || fieldErrors.type ? C.danger : C.muted}
                />
                <Text
                  style={[styles.fieldText, !selected && styles.placeholder, typesError && styles.fieldTextDanger]}
                  numberOfLines={1}
                >
                  {typeFieldText}
                </Text>
                {types === null ? (
                  <ActivityIndicator size="small" color={C.blue} />
                ) : typesError ? null : (
                  <MaterialCommunityIcons name="chevron-down" size={22} color={C.muted} />
                )}
              </TouchableOpacity>
              <FieldError message={fieldErrors.type ?? typesError} />

              {isOther ? (
                <>
                  <Text style={[styles.label, styles.labelGap]}>Please specify</Text>
                  <View style={[styles.field, focused === 'other' && styles.fieldFocused, fieldErrors.other && styles.fieldInvalid]}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={C.muted} />
                    <TextInput
                      style={styles.input}
                      value={otherText}
                      onChangeText={(text) => {
                        setOtherText(text);
                        if (fieldErrors.other) setFieldErrors((prev) => ({ ...prev, other: undefined }));
                      }}
                      onFocus={() => setFocused('other')}
                      onBlur={() => setFocused(null)}
                      placeholder="What kind of request?"
                      placeholderTextColor={C.muted}
                      maxLength={50}
                      returnKeyType="next"
                    />
                  </View>
                  <FieldError message={fieldErrors.other} />
                </>
              ) : null}

              <Text style={[styles.label, styles.labelGap]}>Note for HR</Text>
              <View style={[styles.textAreaWrap, focused === 'notes' && styles.fieldFocused, fieldErrors.notes && styles.fieldInvalid]}>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={(text) => {
                    setNotes(text);
                    if (fieldErrors.notes) setFieldErrors((prev) => ({ ...prev, notes: undefined }));
                  }}
                  onFocus={() => setFocused('notes')}
                  onBlur={() => setFocused(null)}
                  placeholder="What do you need, and why?"
                  placeholderTextColor={C.muted}
                  multiline
                  maxLength={NOTE_LIMIT}
                  textAlignVertical="top"
                />
              </View>
              <FieldError message={fieldErrors.notes} />
              {/* Only near the limit: a "0/2000" under every note is noise. */}
              {notes.length > NOTE_LIMIT - 200 ? (
                <Text style={styles.counter}>{notes.length}/{NOTE_LIMIT}</Text>
              ) : null}
            </View>

            {/* Files */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Supporting files (optional)</Text>
                {pending.length > 0 ? <Text style={styles.labelCount}>{pending.length}</Text> : null}
              </View>

              {pending.map((file, index) => (
                <View key={file.uri} style={[styles.fileRow, index < pending.length - 1 && styles.fileDivider]}>
                  <View style={styles.fileIcon}>
                    <MaterialCommunityIcons name={iconForFile(file.name)} size={20} color={C.blue} />
                  </View>
                  <View style={styles.fileText}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.fileMeta}>{file.size != null ? formatBytes(file.size) : 'Ready to upload'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPending((prev) => prev.filter((f) => f.uri !== file.uri))}
                    style={styles.fileRemove}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${file.name}`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {pending.length > 0 ? <View style={styles.gap} /> : null}
              <AttachButton
                onPress={() => setSheetOpen(true)}
                disabled={submitting || pending.length >= MAX_FILES_PER_SIDE}
                label={pending.length > 0 ? 'Add another file' : 'Add a file'}
              />
            </View>
          </ScrollView>

          {/* Pinned, so Send is always on screen — and above the keyboard while typing. */}
          <View style={[styles.footer, { paddingBottom: keyboardUp ? 10 : 10 + insets.bottom }]}>
            {sendError ? (
              <View style={styles.errorBox} accessibilityRole="alert">
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
                <Text style={styles.errorText}>{sendError}</Text>
              </View>
            ) : null}
            <PrimaryButton
              icon="send-outline"
              label="Send request"
              onPress={() => { void submit(); }}
              loading={submitting}
              disabled={types === null}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <RequestSheet visible={typePickerOpen} onClose={() => setTypePickerOpen(false)} title="Request type">
        <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
          {(types ?? []).length === 0 ? (
            <Text style={styles.blockText}>No request types have been set up for your company yet. Ask HR to add one.</Text>
          ) : (
            (types ?? []).map((t, index) => {
              const active = t.key === selected?.key;
              return (
                <TouchableOpacity
                  key={t.id || t.key}
                  style={[styles.sheetRow, index < (types ?? []).length - 1 && styles.fileDivider]}
                  onPress={() => {
                    setSelected(t);
                    setTypePickerOpen(false);
                    setFieldErrors((prev) => ({ ...prev, type: undefined, other: undefined }));
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{t.label}</Text>
                  {active ? <MaterialCommunityIcons name="check" size={20} color={C.blue} /> : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </RequestSheet>

      <PickSourceSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} onPick={(source) => { void addFile(source); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  gap: { height: 8 },

  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },

  label: { fontSize: 12, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginBottom: 6 },
  labelGap: { marginTop: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelCount: { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 6 },
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
  fieldInvalid: { borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  fieldText: { flex: 1, fontSize: 15, color: C.ink },
  fieldTextDanger: { color: C.danger },
  placeholder: { color: C.muted },
  input: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 },

  textAreaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: { minHeight: 88, maxHeight: 160, fontSize: 15, lineHeight: 21, color: C.ink, paddingVertical: 0 },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: C.muted, marginTop: 4 },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  fileDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  fileIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  fileMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  fileRemove: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center' },

  blockText: { fontSize: 14, lineHeight: 21, color: C.body, paddingVertical: 8 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.danger },

  sheetList: { flexGrow: 0, flexShrink: 1 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingVertical: 12 },
  sheetRowText: { flex: 1, fontSize: 15, color: C.ink },
  sheetRowTextActive: { fontWeight: '800', color: C.blue },
});

export default CreateRequestScreen;
