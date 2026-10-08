/**
 * Request Types
 * The kinds of request employees can choose from. HR keeps this list; every
 * active entry here becomes an option on the employee's New Request screen.
 *
 * A type that has been used cannot be deleted — the requests filed under it
 * keep pointing at it — so the way to retire one is to switch it off. The form
 * carries that switch, and a refused delete offers it.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { SwitchRow } from '../components/leave/LeaveUi';
import { useDialog } from '../components/ui/AppDialog';
import { useApproverAccess } from '../hooks/useApproverAccess';
import requestService, { RequestTypeDetail } from '../api/services/requestService';
import { serverMessage, statusOfError } from '../lib/serverMessage';
import {
  CARD_SURFACE,
  ErrorBanner,
  ListState,
  RequestHeader,
  RequestSheet,
  requestError,
} from '../components/requests/RequestUi';

/** The API has answered with both 'ACTIVE' and 'Active' over time. */
function isActive(status: string | null | undefined): boolean {
  return (status ?? '').toUpperCase() === 'ACTIVE';
}

export const RequestTypesScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  // The screen opens on REQUEST_TYPE.VIEW, but each change needs its own right, and a
  // view-only role was shown Edit and Delete only to meet "Access denied" after tapping
  // them. A refusal that still happens is put in plain words by requestError.
  const access = useApproverAccess();
  const canCreate = access.requestTypeCreate;
  const canEdit = access.requestTypeEdit;
  const canDelete = access.requestTypeDelete;

  const [types, setTypes] = useState<RequestTypeDetail[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [editing, setEditing] = useState<RequestTypeDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [offered, setOffered] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [focused, setFocused] = useState<'code' | 'desc' | 'cat' | null>(null);

  const load = useCallback(async () => {
    setListError(null);
    try {
      setTypes(await requestService.getRequestTypes());
    } catch (err) {
      setTypes((prev) => prev ?? []);
      setListError(requestError(err, 'Could not load the request types.'));
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

  const retry = () => {
    setTypes(null);
    void load();
  };

  const openForm = (type: RequestTypeDetail | null) => {
    setEditing(type);
    setShortCode(type?.shortCode ?? '');
    setDescription(type?.description ?? '');
    setCategory(type?.category ?? '');
    setOffered(type ? isActive(type.status) : true);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) setFormOpen(false);
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
      const status = offered ? 'ACTIVE' : 'INACTIVE';
      // An edit sends the cleared field as '': the server only changes fields it
      // is sent, so leaving an emptied one out made Save quietly bring the old
      // name or category back. A new type simply goes without them.
      if (editing) {
        await requestService.updateRequestType(editing.id, {
          shortCode: code,
          description: description.trim(),
          category: category.trim(),
          status,
        });
      } else {
        await requestService.createRequestType({
          shortCode: code,
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          status,
        });
      }

      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(requestError(err, 'Could not save the request type.'));
    } finally {
      setSaving(false);
    }
  };

  const turnOff = async (type: RequestTypeDetail) => {
    try {
      await requestService.updateRequestType(type.id, { status: 'INACTIVE' });
      await load();
    } catch (err) {
      await dialog.notify({ title: 'Could not turn it off', message: requestError(err, 'Please try again.'), tone: 'danger' });
    }
  };

  const remove = async (type: RequestTypeDetail) => {
    const name = type.description || type.shortCode;
    const ok = await dialog.confirm({
      title: 'Delete this request type?',
      message: `"${name}" will no longer be offered to employees.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await requestService.deleteRequestType(type.id);
      await load();
    } catch (err) {
      // The server keeps any type a request was filed under. Retiring it is
      // what HR is after, and switching it off does exactly that.
      const inUse = statusOfError(err) === 400 && /in use/i.test(serverMessage(err, ''));
      if (inUse && isActive(type.status) && canEdit) {
        const off = await dialog.confirm({
          title: 'This type has been used',
          message: `Requests already sent under "${name}" keep it, so it cannot be deleted. Turn it off instead? Employees will stop seeing it.`,
          confirmText: 'Turn it off',
          tone: 'warning',
        });
        if (off) await turnOff(type);
        return;
      }
      const kept = `Requests already sent under "${name}" keep it, so it cannot be deleted.`;
      await dialog.notify({
        title: 'Could not delete',
        message: !inUse
          ? requestError(err, 'Please try again.')
          : isActive(type.status)
            ? kept
            : `${kept} It is already off, so employees no longer see it.`,
        tone: inUse ? 'info' : 'danger',
      });
    }
  };

  const renderCard = ({ item }: { item: RequestTypeDetail }) => {
    const on = isActive(item.status);
    const name = item.description || item.shortCode;
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => openForm(item)}
          disabled={!canEdit}
          activeOpacity={0.75}
          accessibilityRole={canEdit ? 'button' : undefined}
          accessibilityLabel={canEdit ? `Edit ${name}` : name}
        >
          {/* A plain line icon: the short code used to sit in a blue tile here and
              again in the line below, saying the same thing twice. */}
          <View style={styles.iconTile}>
            <MaterialCommunityIcons name="text-box-outline" size={18} color={on ? C.body : C.muted} />
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, !on && styles.cardTitleOff]} numberOfLines={1}>{name}</Text>
            <View style={styles.metaRow}>
              {/* Only the exception is marked. Most types are on, and an "Active"
                  pill on every row was noise. */}
              {!on ? (
                <View style={styles.pillOff}>
                  <Text style={styles.pillTextOff}>Off</Text>
                </View>
              ) : null}
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.shortCode}
                {item.category ? ` · ${item.category}` : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        {canEdit ? (
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => openForm(item)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${name}`}
          >
            <MaterialCommunityIcons name="pencil-outline" size={20} color={C.body} />
          </TouchableOpacity>
        ) : null}
        {canDelete ? (
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => { void remove(item); }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${name}`}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={C.danger} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop scriptLines={[]} />

      <SafeAreaView style={styles.flex} edges={['top']}>
        <RequestHeader
          title="Request Types"
          onBack={() => navigation.goBack()}
          right={
            canCreate ? (
              <TouchableOpacity
                onPress={() => openForm(null)}
                style={styles.headerAdd}
                accessibilityRole="button"
                accessibilityLabel="Add a request type"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="plus" size={26} color={C.blue} />
              </TouchableOpacity>
            ) : null
          }
        />

        {listError && (types ?? []).length > 0 ? <ErrorBanner message={listError} onRetry={() => { void load(); }} /> : null}

        {types === null ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.blue} />
          </View>
        ) : (
          <FlatList
            data={types}
            keyExtractor={(t) => t.id}
            renderItem={renderCard}
            contentContainerStyle={[styles.list, { paddingBottom: 16 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} colors={[C.blue]} />}
            ListEmptyComponent={
              listError ? (
                <ListState
                  icon="wifi-off"
                  tone="danger"
                  title="Could not load the request types"
                  body={listError}
                  actionLabel="Try again"
                  onAction={retry}
                />
              ) : (
                <ListState
                  icon="format-list-bulleted-type"
                  title="No request types yet"
                  body="Employees choose from this list when they send a request."
                  actionLabel={canCreate ? 'Add a type' : undefined}
                  onAction={canCreate ? () => openForm(null) : undefined}
                />
              )
            }
          />
        )}
      </SafeAreaView>

      {/* Create / edit. Anchored to the bottom and lifted by the keyboard, so the
          last field and Save stay visible while typing on either platform. */}
      <RequestSheet
        visible={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit request type' : 'New request type'}
        avoidKeyboard
        showCancel={false}
      >
        <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
              returnKeyType="next"
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
              placeholder="e.g. Equipment"
              placeholderTextColor={C.muted}
              maxLength={100}
              returnKeyType="next"
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
              returnKeyType="done"
            />
          </View>

          <View style={styles.switchGap}>
            <SwitchRow label="Offered to employees" value={offered} onChange={setOffered} disabled={saving} />
          </View>

          {formError ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.sheetActions}>
          <View style={styles.half}>
            <PrimaryButton label="Cancel" onPress={closeForm} variant="outline" disabled={saving} compact />
          </View>
          <View style={styles.half}>
            <PrimaryButton label={editing ? 'Save' : 'Add'} onPress={() => { void save(); }} loading={saving} compact />
          </View>
        </View>
      </RequestSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FF' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerAdd: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  card: {
    ...CARD_SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 10,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  iconTile: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.field, borderWidth: 1, borderColor: C.line, justifyContent: 'center', alignItems: 'center' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  cardTitleOff: { color: C.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  cardMeta: { flex: 1, fontSize: 12, color: C.muted },
  pillOff: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: '#EEF2F7' },
  pillTextOff: { fontSize: 11, fontWeight: '700', color: C.body },
  iconAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  formScroll: { flexGrow: 0, flexShrink: 1 },
  label: { fontSize: 12, fontWeight: '700', color: C.body, letterSpacing: 0.3, marginTop: 10, marginBottom: 6 },
  field: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  input: { fontSize: 15, color: C.ink, paddingVertical: 0 },
  switchGap: { marginTop: 6 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.dangerLine,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, color: C.danger },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 10 },
  half: { flex: 1 },
});

export default RequestTypesScreen;
