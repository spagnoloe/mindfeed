import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBackend } from '@/backend/BackendProvider';
import { useLoggedOutEmail } from '@/backend/session';
import { AuthError, MIN_PASSWORD_LENGTH } from '@/backend/types';
import { PillButton } from '@/design/PillButton';
import { SegmentedControl } from '@/design/SegmentedControl';
import { TextField } from '@/design/TextField';
import { colors, palette, textStyle } from '@/design/theme';

type Mode = 'signup' | 'login';

const MODES = [
  { value: 'signup', label: 'Sign up' },
  { value: 'login', label: 'Log in' },
] as const;

const LOG_IN_FAILED = 'Incorrect email or password.';

/** The prototype's checks, in its order. Returns the error to show, or null when the form can be sent. */
function validate(mode: Mode, form: { name: string; email: string; password: string }): string | null {
  if (mode === 'signup' && !form.name.trim()) return 'Enter your name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address.';
  if (form.password.length < MIN_PASSWORD_LENGTH) return mode === 'signup' ? 'Password must be at least 6 characters.' : LOG_IN_FAILED;
  return null;
}

/** What to show when the Backend turns the form down. The prototype has no copy for sign-up failures. */
function failureMessage(mode: Mode, error: unknown): string {
  const code = error instanceof AuthError ? error.code : 'unknown';
  // A wrong password and an unknown email read the same (the Backend reports both as
  // invalid-credentials), so the app never reveals which accounts exist. Anything else, such as
  // a lost connection, isn't the user's typing, so it doesn't say it is.
  if (mode === 'login' && code === 'invalid-credentials') return LOG_IN_FAILED;
  if (mode === 'signup' && code === 'email-taken') return 'An account with this email already exists.';
  return 'Something went wrong. Please try again.';
}

/**
 * Sign up / Log in. A successful one changes the session, and the root layout moves on. Right
 * after a log-out, it opens on Log in with that user's email filled in.
 */
export default function SignInScreen() {
  const { auth } = useBackend();
  const insets = useSafeAreaInsets();
  const loggedOutEmail = useLoggedOutEmail();
  const [mode, setMode] = useState<Mode>(loggedOutEmail ? 'login' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(loggedOutEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function submit() {
    if (submitting.current) return;
    const form = { name, email: email.trim(), password };
    const problem = validate(mode, form);
    if (problem) return setError(problem);

    submitting.current = true;
    try {
      if (mode === 'signup') await auth.signUp({ ...form, name: form.name.trim() });
      else await auth.logIn(form);
    } catch (e) {
      setError(failureMessage(mode, e));
    } finally {
      submitting.current = false;
    }
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
      >
        <View style={styles.intro}>
          <Text accessibilityRole="header" accessibilityLabel="mindfeed." style={styles.wordmark}>
            {'mind\nfeed.'}
          </Text>
          <Text style={styles.tagline}>Interesting ideas from great books, one at a time.</Text>
        </View>
        <SegmentedControl
          options={MODES}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError('');
          }}
        />
        <View style={styles.fields}>
          {mode === 'signup' && (
            <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" textContentType="name" />
          )}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
          />
          {error !== '' && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
        </View>
        <View style={styles.fill} />
        <PillButton label={mode === 'signup' ? 'Create account' : 'Log in'} tone="accent" onPress={() => void submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  intro: { gap: 18 },
  wordmark: { ...textStyle(68, 800, { lineHeight: 0.86, letterSpacing: -0.05 }), color: palette.ink },
  tagline: { ...textStyle(19, 400, { lineHeight: 1.45 }), color: palette.ink2, maxWidth: 280 },
  fields: { gap: 14 },
  // The design's `line-height: normal`, as the browser renders it (see TextField's label).
  error: { ...textStyle(14, 600), lineHeight: 17, color: colors.danger },
});
