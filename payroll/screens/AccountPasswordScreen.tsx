/**
 * Change Password.
 * The password lives in Firebase, so it changes there: prove the current one,
 * then set the new one, and the session on this phone stays signed in.
 *
 * A new password does not end the app's own sessions on other phones and
 * browsers; the server keeps honouring their tokens. Someone changing it
 * because a phone was lost or the password leaked is not protected by the
 * change alone, so once it succeeds they are offered to sign out everywhere
 * (this phone included) instead of being told only that it worked. When the
 * server can end the other sessions by itself, that offer can go.
 */

import React, { useRef, useState } from 'react';
import { View, StyleSheet, type TextInput } from 'react-native';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { getFirebaseAuth } from '../lib/firebase';
import { authErrorCode, describeAuthError } from '../lib/firebaseErrors';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { AccountPage, Card, CardHeader, ErrorLine, Field, useSignOutEverywhere } from '../components/account/AccountUi';

export const AccountPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const { busy: endingAll, signOutEverywhere } = useSignOutEverywhere();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const ready = !!currentPassword && !!newPassword && !!confirmPassword;

  const submit = async () => {
    if (!currentPassword) return setError('Enter your current password.');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    if (newPassword === currentPassword) return setError('New password must be different from the current one.');

    const firebaseUser = getFirebaseAuth()?.currentUser;
    if (!firebaseUser?.email) {
      return setError('This session is too old to change the password here. Sign out, sign in again, then retry.');
    }

    setError(null);
    setBusy(true);
    try {
      await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, currentPassword));
      await updatePassword(firebaseUser, newPassword);
    } catch (err) {
      const code = authErrorCode(err);
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Current password is incorrect.'
          : describeAuthError(err, 'Could not update the password. Please try again.'),
      );
      setBusy(false);
      return;
    }
    setBusy(false);
    const endOthers = await dialog.confirm({
      title: 'Password updated',
      message: 'Other phones and browsers stay signed in. Sign out everywhere, this phone included?',
      confirmText: 'Sign out everywhere',
      cancelText: 'Not now',
      destructive: true,
      // The change worked: a green tick, not the red of a failure, over the offer.
      tone: 'success',
    });
    if (endOthers) {
      // Signs this phone out too, which takes the app back to sign-in on success. On
      // failure the hook has said so and the person is still here, password changed.
      await signOutEverywhere();
      return;
    }
    navigation.goBack();
  };

  return (
    <AccountPage title="Change Password">
      <Card>
        <CardHeader icon="lock-reset" title="New Password" hint="At least 6 characters. You stay signed in on this phone." />
        {/* textContentType / autoComplete let iOS and Android offer the saved
            password for the first box and a strong one for the other two. */}
        <Field
          label="Current Password"
          icon="lock-outline"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secure={!showCurrent}
          onToggleSecure={() => setShowCurrent((v) => !v)}
          autoFocus
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
        />
        <Field
          label="New Password"
          icon="lock-plus-outline"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          secure={!showNew}
          onToggleSecure={() => setShowNew((v) => !v)}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          inputRef={newRef}
        />
        <Field
          label="Confirm New Password"
          icon="lock-check-outline"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          secure={!showNew}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={() => { if (ready && !busy) void submit(); }}
          inputRef={confirmRef}
        />
        <ErrorLine message={error} />
        <View style={styles.gap} />
        <PrimaryButton icon="lock-reset" label="Update Password" onPress={() => { void submit(); }} disabled={!ready} loading={busy || endingAll} compact />
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  gap: { height: 12 },
});

export default AccountPasswordScreen;
