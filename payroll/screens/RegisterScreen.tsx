/**
 * Register Screen
 * Creates the account in Firebase first, then syncs it to the backend, sends the
 * verification link, and ends on "Check your inbox".
 *
 * From 2026-10-08 a new account must verify its address before it is signed in
 * (lib/emailVerification): signing straight in let anyone type any address and
 * be inside. That page keeps the Firebase session, so its "Continue" signs in
 * once the link is tapped — nobody retypes what they have just typed.
 *
 * Same building blocks as LoginScreen, and the same rule for errors: a field's
 * problem under that field (the person is usually typing at the bottom, with the
 * keyboard up, and a box at the top was off-screen), the server's at the top.
 */

import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, StatusBar, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  deleteUser,
} from 'firebase/auth';
import authService from '../api/services/authService';
import { API_CONFIG } from '../api/config';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';
import { usePayrollAuth, setKeepSignedIn, getDeviceId } from '../context/PayrollAuthContext';
import { needsEmailVerification } from '../lib/emailVerification';
import AuthBackdrop, {
  AUTH_COLORS as C,
  AuthCard,
  AuthField,
  AuthHeader,
  AuthNotice,
  AuthSwitchRow,
  useKeepFocusedInView,
} from '../components/auth/AuthBackdrop';
import PrimaryButton from '../components/auth/PrimaryButton';
import {
  describeAuthError,
  authErrorCode,
  responseStatus,
  looksLikeEmail,
  SIGN_IN_UNAVAILABLE,
} from '../lib/firebaseErrors';

type FieldName = 'fullName' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

const ORDER: FieldName[] = ['fullName', 'email', 'password', 'confirmPassword'];

/** Firebase codes that are about one field, so they are shown under it. */
const FIELD_OF_CODE: Record<string, FieldName> = {
  'auth/email-already-in-use': 'email',
  'auth/invalid-email': 'email',
  'auth/missing-email': 'email',
  'auth/weak-password': 'password',
  'auth/password-does-not-meet-requirements': 'password',
  'auth/missing-password': 'password',
};

/** "A" and "B" as two sentences, whatever punctuation A came with. */
const twoSentences = (a: string, b: string) => `${a.trim().replace(/[.!?]?$/, '.')} ${b}`;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { loginWithFirebaseToken } = usePayrollAuth();
  const keep = useKeepFocusedInView();
  const refs = {
    fullName: useRef<TextInput>(null),
    email: useRef<TextInput>(null),
    password: useRef<TextInput>(null),
    confirmPassword: useRef<TextInput>(null),
  };

  // One name field, as on the IC or passport. The backend splits Firebase's
  // displayName at the first space whatever the form asked, so two boxes only
  // made people with one name (common among the foreign workers this payroll
  // serves) unable to sign up, and filed "Muhammad Ali bin Abu" wrongly anyway.
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  // The account exists (Firebase, and maybe the backend row) but signing in did
  // not finish. The button then retries the sign-in; creating again would only
  // answer "already exists".
  const [created, setCreated] = useState(false);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = 'Enter your full name.';
    const trimmedEmail = email.trim();
    if (!trimmedEmail) errors.email = 'Enter your email address.';
    else if (!looksLikeEmail(trimmedEmail)) errors.email = 'This does not look like an email address.';
    if (!password) errors.password = 'Choose a password.';
    else if (password.length < 6) errors.password = 'Use at least 6 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Type the password again.';
    else if (password && confirmPassword !== password) errors.confirmPassword = 'The two passwords are different.';
    return errors;
  };

  const showFieldErrors = (errors: FieldErrors) => {
    setFieldErrors(errors);
    const first = ORDER.find((name) => errors[name]);
    if (first) refs[first].current?.focus();
  };

  // Typing in a field clears its complaint; the others stay until they are fixed.
  const change = (name: FieldName, setter: (v: string) => void) => (value: string) => {
    setter(value);
    if (fieldErrors[name]) {
      setFieldErrors((f) => {
        const next = { ...f };
        delete next[name];
        return next;
      });
    }
  };

  /** Sign in with the Firebase user this phone already holds. */
  const finishSignIn = async () => {
    const firebaseUser = getFirebaseAuth()?.currentUser;
    if (!firebaseUser) {
      navigation.navigate('Login');
      return;
    }
    setError(null);
    await firebaseUser.reload().catch(() => {});
    if (needsEmailVerification(firebaseUser)) {
      navigation.navigate('EmailVerification', { email: firebaseUser.email ?? undefined });
      return;
    }
    setLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken(true);
      // A previous person on this phone may have unticked "Keep me signed in".
      await setKeepSignedIn(true);
      await loginWithFirebaseToken(idToken, await getDeviceId());
    } catch (err) {
      setError(describeAuthError(err, 'We could not sign you in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (loading) return;
    if (created) {
      await finishSignIn();
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const firebaseAuth = isFirebaseConfigured() ? getFirebaseAuth() : null;
    if (!firebaseAuth) {
      if (__DEV__) console.warn('[Register] Firebase is not configured: add EXPO_PUBLIC_FIREBASE_* to AiPayrollApp/.env (see FIREBASE_SETUP.md).');
      setError(SIGN_IN_UNAVAILABLE);
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    setError(null);
    setLoading(true);
    let step = 'firebase_create';
    // Set once the account cannot be created again: from then on the way
    // forward is signing in, and the button says so.
    let accountExists = false;
    try {
      if (__DEV__) console.log('[Register] API base URL:', API_CONFIG.baseUrl);
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, emailTrimmed, password);
      step = 'firebase_profile';
      await updateProfile(userCredential.user, { displayName: fullName.trim() || emailTrimmed });
      // Refresh so the token carries the display name just set.
      step = 'firebase_token';
      const firebaseIdToken = await userCredential.user.getIdToken(true);
      const deviceId = await getDeviceId();

      // The backend row is what makes this a payroll account; a Firebase user on
      // its own is nothing. So the backend goes first, and a definite rejection
      // (4xx: bad token, validation) removes the Firebase user again — otherwise
      // the email stays "already in use" with no account behind it.
      // On a transport failure or a 5xx the backend may have written the row
      // already, and deleting the Firebase user then would strand it: the
      // sign-in path creates the backend row if it is missing, so the Firebase
      // user is kept and the person can finish by signing in.
      step = 'backend_signup';
      try {
        await authService.firebaseSignUp(firebaseIdToken, deviceId);
      } catch (backendErr) {
        const status = responseStatus(backendErr);
        if (status !== undefined && status >= 400 && status < 500) {
          await deleteUser(userCredential.user).catch(() => {});
        } else {
          accountExists = true;
        }
        throw backendErr;
      }
      accountExists = true;

      // A gate since 2026-10-08 (lib/emailVerification): the account is not signed in until the
      // link is tapped. A mail that fails to go out is resent from the next page.
      step = 'verification_mail';
      await sendEmailVerification(userCredential.user).catch((mailErr: unknown) => {
        if (__DEV__) console.warn('[Register] Verification email not sent:', mailErr);
      });
      await setKeepSignedIn(true);
      // The Firebase session stays, so "Continue" there signs in once the link is tapped.
      navigation.navigate('EmailVerification', { email: emailTrimmed });
    } catch (err: unknown) {
      if (__DEV__) {
        const e = err as { message?: string; response?: { data?: unknown } } | null;
        console.error('[Register] Failed at step:', step, '| Error:', e?.message ?? err);
        // response is undefined when the request never reached the server
        // (e.g. Network Error = wrong URL / unreachable)
        console.error('[Register] Response:', e?.response?.data ?? '(no response – check API base URL and backend reachable)');
      }
      if (accountExists) {
        setCreated(true);
        setError(
          twoSentences(
            describeAuthError(err, 'We could not sign you in.'),
            'Your account is saved — tap Continue to sign in.',
          ),
        );
        return;
      }
      const message = describeAuthError(err, 'We could not create your account. Please try again.');
      const field = FIELD_OF_CODE[authErrorCode(err)];
      if (field) {
        const errors: FieldErrors = {};
        errors[field] = message;
        showFieldErrors(errors);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const editable = !loading && !created;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthBackdrop />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <ScrollView
            ref={keep.scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AuthHeader title="Create account" subtitle="You join your company in the next step." />

            <AuthCard onLayout={keep.onCardLayout}>
              <AuthNotice message={error} />

              <AuthField
                ref={refs.fullName}
                label="Full name"
                icon="account-outline"
                placeholder="As on your IC or passport"
                value={fullName}
                onChangeText={change('fullName', setFullName)}
                error={fieldErrors.fullName}
                onLayout={keep.onFieldLayout('fullName')}
                onFocus={() => keep.onFieldFocus('fullName')}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                editable={editable}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => refs.email.current?.focus()}
              />

              <AuthField
                ref={refs.email}
                label="Email"
                icon="email-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={change('email', setEmail)}
                error={fieldErrors.email}
                onLayout={keep.onFieldLayout('email')}
                onFocus={() => keep.onFieldFocus('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={editable}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => refs.password.current?.focus()}
              />

              <AuthField
                ref={refs.password}
                label="Password"
                icon="lock-outline"
                placeholder="At least 6 characters"
                secret
                value={password}
                onChangeText={change('password', setPassword)}
                error={fieldErrors.password}
                onLayout={keep.onFieldLayout('password')}
                onFocus={() => keep.onFieldFocus('password')}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="new-password"
                textContentType="newPassword"
                editable={editable}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => refs.confirmPassword.current?.focus()}
              />

              <AuthField
                ref={refs.confirmPassword}
                label="Confirm password"
                icon="lock-check-outline"
                placeholder="Type it again"
                secret
                value={confirmPassword}
                onChangeText={change('confirmPassword', setConfirmPassword)}
                error={fieldErrors.confirmPassword}
                onLayout={keep.onFieldLayout('confirmPassword')}
                onFocus={() => keep.onFieldFocus('confirmPassword')}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="new-password"
                textContentType="newPassword"
                editable={editable}
                returnKeyType="go"
                onSubmitEditing={() => { void handleRegister(); }}
              />

              <View style={styles.actionGap} />
              <PrimaryButton
                label={created ? 'Continue' : 'Create account'}
                icon={created ? 'arrow-right' : undefined}
                onPress={() => { void handleRegister(); }}
                loading={loading}
              />
            </AuthCard>

            {/* Under the card, as on Login, so the two pages read as one pair. */}
            <View style={styles.switchGap}>
              <AuthSwitchRow
                prompt="Already have an account?"
                action="Sign in"
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  actionGap: { height: 16 },
  switchGap: { marginTop: 12 },
});

export default RegisterScreen;
