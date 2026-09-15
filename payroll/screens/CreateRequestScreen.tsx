/**
 * New Request
 * Pick a type, say when and why, attach anything that supports it, send.
 *
 * Files are held on the phone until the request exists, then uploaded to it —
 * there is nothing to attach them to before that. If a file fails to upload the
 * request still stands, and the person is told exactly which one to add again
 * from the detail screen.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
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
import { AttachButton, PickSourceSheet } from '../components/requests/RequestUi';

const OTHER_KEY = 'other';

export const CreateRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [types, setTypes] = useState<RequestType[] | null>(null);
  const [typeKey, setTypeKey] = useState('');
  const [typeLabel, setTypeLabel] = useState('');
  const [otherText, setOtherText] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<PickedFile[]>([]);

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'other' | 'notes' | null>(null);

  const isOther = typeKey === OTHER_KEY;

  const loadTypes = useCallback(async () => {
    try {
      setTypes(await requestService.getTypes());
    } catch (err) {
      setTypes([]);
      setError(serverMessage(err, 'Could not load the request types. Pull back and try again.'));
    }
  }, []);

  React.useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const addFile = async (source: PickSource) => {
    setSheetOpen(false);
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

  const validate = (): string | null => {
    if (!typeKey) return 'Choose what kind of request this is.';
    if (isOther && !otherText.trim()) return 'Say what kind of request this is.';
    if (!notes.trim()) return 'Add a note so HR knows what you need.';
    return null;
  };

  const submit = async (asDraft: boolean) => {
    const invalid = asDraft ? (typeKey ? null : 'Choose what kind of request this is.') : validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const created = await requestService.createApplication({
        requestType: isOther ? otherText.trim() : typeLabel || typeKey,
        notes: notes.trim() || undefined,
        isDraft: asDraft,
      });

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
          title: asDraft ? 'Saved, but some files did not attach' : 'Sent, but some files did not attach',
          message: `${failed.join(', ')} could not be uploaded. Open the request to try again.`,
          tone: 'warning',
        });
      } else {
        await dialog.notify({
          title: asDraft ? 'Saved as draft' : 'Request sent',
          message: asDraft ? 'You can finish it later from My Requests.' : 'HR will review it and reply here.',
          tone: 'success',
        });
      }
      navigation.goBack();
    } catch (err) {
      setError(serverMessage(err, 'Could not send the request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
            </TouchableOpacity>
            <View style={styles.headerText} pointerEvents="none">
              <Text style={styles.headerTitle}>New Request</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* What */}
            <View style={styles.card}>
              <Text style={styles.label}>Request type</Text>
              <TouchableOpacity
                style={[styles.field, typePickerOpen && styles.fieldFocused]}
                onPress={() => setTypePickerOpen(true)}
                disabled={types === null}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="format-list-bulleted-type" size={20} color={C.muted} />
                <Text style={[styles.fieldText, !typeLabel && styles.placeholder]} numberOfLines={1}>
                  {types === null ? 'Loading…' : typeLabel || 'Choose a type'}
                </Text>
                {types === null ? (
                  <ActivityIndicator size="small" color={C.blue} />
                ) : (
                  <MaterialCommunityIcons name="chevron-down" size={22} color={C.muted} />
                )}
              </TouchableOpacity>

              {isOther ? (
                <>
                  <Text style={styles.label}>Please specify</Text>
                  <View style={[styles.field, focused === 'other' && styles.fieldFocused]}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={C.muted} />
                    <TextInput
                      style={styles.input}
                      value={otherText}
                      onChangeText={setOtherText}
                      onFocus={() => setFocused('other')}
                      onBlur={() => setFocused(null)}
                      placeholder="What kind of request?"
                      placeholderTextColor={C.muted}
                      maxLength={50}
                    />
                  </View>
                </>
              ) : null}

            </View>

            {/* Why */}
            <View style={styles.card}>
              <Text style={styles.label}>Note for HR</Text>
              <View style={[styles.textAreaWrap, focused === 'notes' && styles.fieldFocused]}>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  onFocus={() => setFocused('notes')}
                  onBlur={() => setFocused(null)}
                  placeholder="Say what you need and why."
                  placeholderTextColor={C.muted}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.counter}>{notes.length}/2000</Text>
            </View>

            {/* Files */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons name="paperclip" size={20} color={C.blue} />
                </View>
                <Text style={styles.cardTitle}>Supporting files</Text>
                {pending.length > 0 ? <Text style={styles.cardCount}>{pending.length}</Text> : null}
              </View>

              {pending.map((file, index) => (
                <View key={file.uri} style={[styles.fileRow, index < pending.length - 1 && styles.fileDivider]}>
                  <View style={styles.fileIcon}>
                    <MaterialCommunityIcons name={iconForFile(file.name)} size={22} color={C.blue} />
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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton icon="send-outline" label="Send request" onPress={() => { void submit(false); }} loading={submitting} />
            <PrimaryButton label="Save as draft" onPress={() => { void submit(true); }} variant="outline" disabled={submitting} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Type picker */}
      <Modal visible={typePickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setTypePickerOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTypePickerOpen(false)} accessibilityLabel="Dismiss" />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Request type</Text>
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {(types ?? []).length === 0 ? (
                <Text style={styles.blockText}>No request types have been set up for your company yet. Ask HR to add one.</Text>
              ) : (
                (types ?? []).map((t, index) => {
                  const active = t.key === typeKey;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.sheetRow, index < (types ?? []).length - 1 && styles.fileDivider]}
                      onPress={() => {
                        setTypeKey(t.key);
                        setTypeLabel(t.label);
                        setTypePickerOpen(false);
                        setError(null);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{t.label}</Text>
                      {active ? <MaterialCommunityIcons name="check" size={20} color={C.blue} /> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setTypePickerOpen(false)} accessibilityRole="button">
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PickSourceSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} onPick={(source) => { void addFile(source); }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  gap: { height: 10 },

  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: C.ink },
  cardCount: { fontSize: 13, fontWeight: '700', color: C.muted },

  label: { fontSize: 12, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginBottom: 6, marginTop: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  fieldText: { flex: 1, fontSize: 15, color: C.ink },
  placeholder: { color: C.muted },
  input: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 },

  textAreaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: { minHeight: 120, fontSize: 15, lineHeight: 22, color: C.ink },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: C.muted, marginTop: 6 },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  fileDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  fileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  fileText: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: C.ink },
  fileMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  fileRemove: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.dangerBg, justifyContent: 'center', alignItems: 'center' },

  blockText: { fontSize: 14, lineHeight: 21, color: C.body, paddingVertical: 8 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19, color: C.danger },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'flex-end', padding: 16 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    maxHeight: '70%',
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 6 },
  sheetList: { flexGrow: 0 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetRowText: { flex: 1, fontSize: 15, color: C.ink },
  sheetRowTextActive: { fontWeight: '800', color: C.blue },
  sheetCancel: { height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: C.body },
});

export default CreateRequestScreen;
