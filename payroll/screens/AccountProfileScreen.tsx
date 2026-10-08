/**
 * Edit Profile — photo, first name, last name.
 * Writes through the same web endpoints the dashboard uses, so a name saved
 * here reads back identically on a laptop. This is the account's own name;
 * the employee record HR keeps (payslips, approval lists) is a separate copy
 * this page does not change, which is what the card's one-line hint says.
 * The hint shows only to someone linked to an employee record: an HR or owner
 * account without one has no payslips for it to be about.
 *
 * Titled "Edit Profile" because the tab that leads here is itself "Profile".
 */

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, type TextInput } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import accountService, { accountErrorMessage } from '../api/services/accountService';
import { useAvatarUrl, setCachedAvatar } from '../hooks/useAvatar';
import { useDialog } from '../components/ui/AppDialog';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { AccountPage, Card, CardHeader, ErrorLine, Field } from '../components/account/AccountUi';

/** UpdateUserProfileDTO.FullName is [MaxLength(100)]; first + space + last must fit. */
const FULL_NAME_MAX = 100;

export const AccountProfileScreen: React.FC = () => {
  const { user, updateUserProfile } = usePayrollAuth();
  const userId = user?.uid ?? '';
  const dialog = useDialog();
  const lastNameRef = useRef<TextInput>(null);

  // ── Photo ──────────────────────────────────────────────────────────
  const avatarUrl = useAvatarUrl(userId);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const initials = useMemo(() => {
    const a = (user?.firstName || user?.name || '?').charAt(0).toUpperCase();
    const b = (user?.lastName || '').charAt(0).toUpperCase();
    return `${a}${b}`;
  }, [user?.firstName, user?.lastName, user?.name]);

  const pickAvatar = async () => {
    if (!userId) return;
    let result: ImagePicker.ImagePickerResult;
    try {
      // No permission request first: the library opens the system photo picker
      // (iOS 14+, Android 13+), which needs none. Asking anyway sent anyone who
      // had once tapped "Don't Allow" to phone settings for a picker that works.
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : '';
      await dialog.notify(
        /permission/i.test(text)
          ? { title: 'Photos access needed', message: 'Allow photo access for AiPayroll in your phone settings, then try again.', tone: 'warning' }
          : { title: 'Could not open your photos', message: 'Please try again.', tone: 'danger' },
      );
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setAvatarBusy(true);
    try {
      await accountService.uploadAvatar(userId, asset.uri, asset.mimeType ?? 'image/jpeg');
      // The server caches the URL and the file may sit at the same address as
      // before; stamp it so the image component fetches it again.
      const fresh = await accountService.getAvatarUrl(userId);
      setCachedAvatar(userId, fresh ? `${fresh}${fresh.includes('?') ? '&' : '?'}t=${Date.now()}` : asset.uri);
    } catch (err) {
      await dialog.notify({ title: 'Upload failed', message: accountErrorMessage(err, 'Could not upload the photo. Please try again.'), tone: 'danger' });
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    const ok = await dialog.confirm({ title: 'Remove photo?', message: 'Your initials will be shown instead.', confirmText: 'Remove', destructive: true });
    if (!ok) return;
    setAvatarBusy(true);
    try {
      await accountService.removeAvatar(userId);
      setCachedAvatar(userId, null);
    } catch (err) {
      await dialog.notify({ title: 'Could not remove photo', message: accountErrorMessage(err, 'Please try again.'), tone: 'danger' });
    } finally {
      setAvatarBusy(false);
    }
  };

  // ── Name ───────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const nameDirty =
    firstName.trim() !== (user?.firstName ?? '').trim() || lastName.trim() !== (user?.lastName ?? '').trim();

  const saveName = async () => {
    if (!firstName.trim()) return setNameError('First name is required.');
    if (!lastName.trim()) return setNameError('Last name is required.');
    if (firstName.trim().includes(' ')) {
      // The server splits the full name on its first space; a space inside the
      // first name would silently move the rest into the last name.
      return setNameError('First name cannot contain spaces. Put extra names in the last name.');
    }
    if (`${firstName.trim()} ${lastName.trim()}`.length > FULL_NAME_MAX) {
      // Each box allows 50, so together they can pass the server's limit, which
      // otherwise answers only "Invalid data provided".
      return setNameError(`First and last name together must be ${FULL_NAME_MAX} characters or fewer.`);
    }
    setNameError(null);
    setNameBusy(true);
    try {
      await accountService.updateName(userId, firstName, lastName);
      await updateUserProfile({ firstName, lastName });
      await dialog.notify({ title: 'Saved', message: 'Your name has been updated.', tone: 'success' });
    } catch (err) {
      setNameError(accountErrorMessage(err, 'Could not save your name. Please try again.'));
    } finally {
      setNameBusy(false);
    }
  };

  return (
    <AccountPage title="Edit Profile">
      <Card>
        <View style={styles.avatarRow}>
          <TouchableOpacity
            onPress={() => { void pickAvatar(); }}
            disabled={avatarBusy}
            style={styles.avatarWrap}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              {avatarBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{user?.name || 'Your account'}</Text>
            {/* The sign-in email, shown rather than offered as a field: it cannot be changed here. */}
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity onPress={() => { void pickAvatar(); }} disabled={avatarBusy} style={styles.photoAction} accessibilityRole="button">
                <Text style={styles.link}>{avatarUrl ? 'Change photo' : 'Add photo'}</Text>
              </TouchableOpacity>
              {avatarUrl ? (
                <TouchableOpacity onPress={() => { void removeAvatar(); }} disabled={avatarBusy} style={styles.photoAction} accessibilityRole="button">
                  <Text style={styles.linkDanger}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <CardHeader
          icon="account-edit-outline"
          title="Your Name"
          hint={user?.employeeId ? 'Payslips use the name HR has on file.' : undefined}
        />
        <Field
          label="First Name"
          icon="account-outline"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          autoCapitalize="words"
          maxLength={50}
          textContentType="givenName"
          autoComplete="given-name"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />
        <Field
          label="Last Name"
          icon="account-outline"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          autoCapitalize="words"
          maxLength={50}
          textContentType="familyName"
          autoComplete="family-name"
          returnKeyType="done"
          onSubmitEditing={() => { if (nameDirty) void saveName(); }}
          inputRef={lastNameRef}
        />
        <ErrorLine message={nameError} />
        <View style={styles.gap} />
        <PrimaryButton icon="content-save-outline" label="Save Name" onPress={() => { void saveName(); }} disabled={!nameDirty} loading={nameBusy} compact />
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { width: 72, height: 72 },
  avatarImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.blueSoft },
  avatarFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.blueSoft, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 24, fontWeight: '700', color: C.blue },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.blue,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: '700', color: C.ink },
  email: { fontSize: 13, color: C.body, marginTop: 1 },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginLeft: -8 },
  // 44pt tall so a thumb lands on the words, not between them.
  photoAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  link: { fontSize: 14, fontWeight: '700', color: C.blue },
  linkDanger: { fontSize: 14, fontWeight: '700', color: C.danger },
  gap: { height: 12 },
});

export default AccountProfileScreen;
