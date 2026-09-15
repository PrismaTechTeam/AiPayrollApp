/**
 * Profile — photo, first name, last name.
 * Writes through the same web endpoints the dashboard uses, so a name saved
 * here reads back identically on a laptop.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { usePayrollAuth } from '../context/PayrollAuthContext';
import { describeAuthError } from '../lib/firebaseErrors';
import accountService from '../api/services/accountService';
import { useAvatarUrl, setCachedAvatar } from '../hooks/useAvatar';
import { useDialog } from '../components/ui/AppDialog';
import { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import { AccountPage, Card, CardHeader, ErrorLine, Field } from '../components/account/AccountUi';

export const AccountProfileScreen: React.FC = () => {
  const { user, updateUserProfile } = usePayrollAuth();
  const userId = user?.uid ?? '';
  const dialog = useDialog();

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
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        await dialog.notify({ title: 'Photos access needed', message: 'Allow photo access in your phone settings to choose a profile picture.', tone: 'warning' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setAvatarBusy(true);
      await accountService.uploadAvatar(userId, asset.uri, asset.mimeType ?? 'image/jpeg');
      // The server caches the URL and the file may sit at the same address as
      // before; stamp it so the image component fetches it again.
      const fresh = await accountService.getAvatarUrl(userId);
      setCachedAvatar(userId, fresh ? `${fresh}${fresh.includes('?') ? '&' : '?'}t=${Date.now()}` : asset.uri);
    } catch (err) {
      await dialog.notify({ title: 'Upload failed', message: describeAuthError(err, 'Could not upload the photo. Please try again.'), tone: 'danger' });
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
      await dialog.notify({ title: 'Could not remove photo', message: describeAuthError(err, 'Please try again.'), tone: 'danger' });
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
    setNameError(null);
    setNameBusy(true);
    try {
      await accountService.updateName(userId, firstName, lastName);
      await updateUserProfile({ firstName, lastName });
      await dialog.notify({ title: 'Saved', message: 'Your name has been updated.', tone: 'success' });
    } catch (err) {
      setNameError(describeAuthError(err, 'Could not save your name. Please try again.'));
    } finally {
      setNameBusy(false);
    }
  };

  return (
    <AccountPage title="Profile" subtitle="Photo and name">
      <Card>
        <View style={styles.avatarRow}>
          <TouchableOpacity onPress={pickAvatar} disabled={avatarBusy} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel="Change profile picture">
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
                <MaterialCommunityIcons name="camera" size={15} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.flex}>
            <Text style={styles.title}>Profile Picture</Text>
            <Text style={styles.hint}>Tap the photo to choose a new one. JPG or PNG, square works best.</Text>
            {avatarUrl ? (
              <TouchableOpacity onPress={() => { void removeAvatar(); }} disabled={avatarBusy} hitSlop={{ top: 6, bottom: 6 }}>
                <Text style={styles.linkDanger}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Card>

      <Card>
        <CardHeader icon="account-outline" title="Your Details" hint="This is the name HR and your colleagues see." />
        <Field label="Email" icon="email-outline" value={user?.email ?? ''} editable={false} note="Your email is your sign-in and cannot be changed here." />
        <Field label="First Name" icon="account-outline" value={firstName} onChangeText={setFirstName} placeholder="First name" autoCapitalize="words" maxLength={50} />
        <Field label="Last Name" icon="account-outline" value={lastName} onChangeText={setLastName} placeholder="Last name" autoCapitalize="words" maxLength={50} />
        <ErrorLine message={nameError} />
        <View style={styles.gap} />
        <PrimaryButton icon="content-save-outline" label="Save Changes" onPress={saveName} disabled={!nameDirty} loading={nameBusy} />
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { width: 84, height: 84 },
  avatarImage: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#D8E6FB' },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#D8E6FB', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: C.blue },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.blue,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: C.ink },
  hint: { fontSize: 13, lineHeight: 19, color: C.body, marginTop: 3, marginBottom: 6 },
  linkDanger: { fontSize: 13, fontWeight: '700', color: C.danger, marginTop: 2 },
  gap: { height: 12 },
});

export default AccountProfileScreen;
