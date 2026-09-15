/**
 * Request Types
 * The kinds of request employees can choose from. HR keeps this list; every
 * entry here becomes an option on the employee's New Request screen.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import requestService, { RequestTypeDetail } from '../api/services/requestService';
import { serverMessage } from '../lib/serverMessage';

/** The API has answered with both 'ACTIVE' and 'Active' over time. */
function isActive(status: string | null | undefined): boolean {
  return (status ?? '').toUpperCase() === 'ACTIVE';
}

export const RequestTypesScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();

  const [types, setTypes] = useState<RequestTypeDetail[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [editing, setEditing] = useState<RequestTypeDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'code' | 'desc' | 'cat' | null>(null);

  const load = useCallback(async () => {
    setListError(null);
    try {
      setTypes(await requestService.getRequestTypes());
    } catch (err) {
      setTypes((prev) => prev ?? []);
      setListError(serverMessage(err, 'Could not load the request types. Pull down to try again.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openForm = (type: RequestTypeDetail | null) => {
    setEditing(type);
    setShortCode(type?.shortCode ?? '');
    setDescription(type?.description ?? '');
    setCategory(type?.category ?? '');
    setFormError(null);
    setFormOpen(true);
  };

  const save = async () => {
    const code = shortCode.trim();
    if (!code) {
      setFormError('A short code is required.');
      return;
    }
    // Two types with the same code would be indistinguishable to an employee.
    const clash = (types ?? []).some(
      (t) => t.id !== editing?.id && t.shortCode.trim().toUpperCase() === code.toUpperCase(),
    );
    if (clash) {
      setFormError(`"${code}" is already in use. Choose a different short code.`);
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        shortCode: code,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
      };
      if (editing) await requestService.updateRequestType(editing.id, payload);
      else await requestService.createRequestType({ ...payload, status: 'ACTIVE' });

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(serverMessage(err, 'Could not save the request type.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type: RequestTypeDetail) => {
    const ok = await dialog.confirm({
      title: 'Delete this request type?',
      message: `"${type.description || type.shortCode}" will no longer be offered to employees. Requests already sent keep their type.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await requestService.deleteRequestType(type.id);
      await load();
    } catch (err) {
      await dialog.notify({
        title: 'Could not delete',
        message: serverMessage(err, 'It may be in use by existing requests.'),
        tone: 'danger',
      });
    }
  };

  const renderCard = ({ item }: { item: RequestTypeDetail }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.codeTile}>
          <Text style={styles.codeText} numberOfLines={1}>{item.shortCode.slice(0, 4).toUpperCase()}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.description || item.shortCode}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.shortCode}
            {item.category ? ` · ${item.category}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, isActive(item.status) ? styles.pillOn : styles.pillOff]}>
          <Text style={[styles.pillText, isActive(item.status) ? styles.pillTextOn : styles.pillTextOff]}>
            {isActive(item.status) ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardAction} onPress={() => openForm(item)} accessibilityRole="button">
          <MaterialCommunityIcons name="pencil-outline" size={16} color={C.blue} />
          <Text style={styles.cardActionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardAction, styles.cardActionDanger]}
          onPress={() => { void remove(item); }}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.danger} />
          <Text style={[styles.cardActionText, styles.cardActionTextDanger]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Request Types</Text>
          </View>
          <TouchableOpacity
            onPress={() => openForm(null)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Add a request type"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="plus" size={26} color={C.blue} />
          </TouchableOpacity>
        </View>

        {types === null ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : (
          <FlatList
            data={types}
            keyExtractor={(t) => t.id}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <MaterialCommunityIcons name={listError ? 'wifi-off' : 'format-list-bulleted-type'} size={32} color={listError ? C.danger : C.blue} />
                </View>
                <Text style={styles.emptyTitle}>{listError ? 'Could not load' : 'No request types yet'}</Text>
                <Text style={styles.emptyBody}>
                  {listError ?? 'Add one so employees have something to choose when they send a request.'}
                </Text>
                {!listError ? (
                  <>
                    <View style={styles.gap} />
                    <PrimaryButton icon="plus" label="Add a type" onPress={() => openForm(null)} />
                  </>
                ) : null}
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Create / edit */}
      <Modal visible={formOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => !saving && setFormOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.sheetBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => !saving && setFormOpen(false)} accessibilityLabel="Dismiss" />
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{editing ? 'Edit request type' : 'New request type'}</Text>

              <Text style={styles.label}>Short code</Text>
              <View style={[styles.field, focused === 'code' && styles.fieldFocused]}>
                <TextInput
                  style={styles.input}
                  value={shortCode}
                  onChangeText={setShortCode}
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused(null)}
                  placeholder="e.g. EQUIP"
                  placeholderTextColor={C.muted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                />
              </View>

              <Text style={styles.label}>Name employees see</Text>
              <View style={[styles.field, focused === 'desc' && styles.fieldFocused]}>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => setFocused('desc')}
                  onBlur={() => setFocused(null)}
                  placeholder="e.g. Equipment Request"
                  placeholderTextColor={C.muted}
                  maxLength={100}
                />
              </View>

              <Text style={styles.label}>Category (optional)</Text>
              <View style={[styles.field, focused === 'cat' && styles.fieldFocused]}>
                <TextInput
                  style={styles.input}
                  value={category}
                  onChangeText={setCategory}
                  onFocus={() => setFocused('cat')}
                  onBlur={() => setFocused(null)}
                  placeholder="e.g. Facilities"
                  placeholderTextColor={C.muted}
                  maxLength={50}
                />
              </View>

              {formError ? (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.sheetActions}>
                <View style={styles.half}>
                  <PrimaryButton label="Cancel" onPress={() => setFormOpen(false)} variant="outline" disabled={saving} compact />
                </View>
                <View style={styles.half}>
                  <PrimaryButton label={editing ? 'Save' : 'Add'} onPress={() => { void save(); }} loading={saving} compact />
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  gap: { height: 12, width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 12, paddingTop: 4 },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerText: { position: 'absolute', left: 88, right: 88, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },

  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeTile: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E8F0FE', justifyContent: 'center', alignItems: 'center' },
  codeText: { fontSize: 12, fontWeight: '800', color: C.blue },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  cardMeta: { fontSize: 12, color: C.body, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillOn: { backgroundColor: '#DCFCE7' },
  pillOff: { backgroundColor: '#EEF2F7' },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillTextOn: { color: '#15803D' },
  pillTextOff: { color: C.body },

  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cardAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9DAF8',
    backgroundColor: '#F8FBFF',
  },
  cardActionDanger: { borderColor: C.dangerLine, backgroundColor: C.dangerBg },
  cardActionText: { fontSize: 13, fontWeight: '700', color: C.blue },
  cardActionTextDanger: { color: C.danger },

  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8, marginTop: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  emptyBody: { fontSize: 14, lineHeight: 20, color: C.body, textAlign: 'center' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'center', padding: 22 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: C.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: C.ink, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginTop: 10, marginBottom: 6 },
  field: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  input: { fontSize: 15, color: C.ink, paddingVertical: 0 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.danger },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  half: { flex: 1 },
});

export default RequestTypesScreen;
