/**
 * Change Password.
 * The password lives in Firebase, so it changes there: prove the current one,
 * then set the new one. Nothing goes through our server, and the session on
 * this phone stays signed in.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { getFirebaseAuth } from '../lib/firebase';
import { authErrorCode, describeAuthError } from '../lib/firebaseErrors';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useDialog } from '../components/ui/AppDialog';
import { AccountPage, Card, CardHeader, ErrorLine, Field } from '../components/account/AccountUi';

export const AccountPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const dialog = useDialog();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await dialog.notify({ title: 'Password updated', message: 'Use the new password the next time you sign in.', tone: 'success' });
      navigation.goBack();
    } catch (err) {
      const code = authErrorCode(err);
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Current password is incorrect.'
          : describeAuthError(err, 'Could not update the password. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountPage title="Change Password" subtitle="You stay signed in on this phone">
      <Card>
        <CardHeader icon="lock-outline" title="New Password" hint="At least 6 characters. Avoid one you use elsewhere." />
        <Field label="Current Password" icon="lock-outline" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secure={!showCurrent} onToggleSecure={() => setShowCurrent((v) => !v)} autoFocus />
        <Field label="New Password" icon="lock-plus-outline" value={newPassword} onChangeText={setNewPassword} placeholder="New password" secure={!showNew} onToggleSecure={() => setShowNew((v) => !v)} />
        <Field label="Confirm New Password" icon="lock-check-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" secure={!showNew} />
        <ErrorLine message={error} />
        <View style={styles.gap} />
        <PrimaryButton icon="lock-reset" label="Update Password" onPress={submit} disabled={!currentPassword || !newPassword || !confirmPassword} loading={busy} />
      </Card>
    </AccountPage>
  );
};

const styles = StyleSheet.create({
  gap: { height: 12 },
});

export default AccountPasswordScreen;
