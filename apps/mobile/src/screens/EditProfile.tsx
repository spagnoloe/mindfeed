import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSaveProfile } from '@/backend/profile';
import { AuthError, MIN_PASSWORD_LENGTH, type Profile } from '@/backend/types';
import { SectionHeading } from '@/design/headings';
import { PillButton } from '@/design/PillButton';
import { TextField } from '@/design/TextField';
import { colors, palette, textStyle } from '@/design/theme';

type Draft = Profile & { currentPassword: string; newPassword: string };

/** The prototype's checks, in its order. Returns the error to show, or null when the form can be saved. */
function validate(draft: Draft): string | null {
  if (!draft.name.trim()) return 'Name can’t be empty.';
  if (draft.currentPassword || draft.newPassword) {
    if (!draft.currentPassword) return 'Enter your current password.';
    if (draft.newPassword.length < MIN_PASSWORD_LENGTH) return 'New password must be at least 6 characters.';
  }
  return null;
}

/** What to show when saving fails. The prototype has copy only for the password check. */
function failureMessage(error: unknown): string {
  if (error instanceof AuthError && error.code === 'wrong-password') return 'Current password is incorrect.';
  return 'Something went wrong. Please try again.';
}

/**
 * Edit profile, covering the whole screen, tab bar included: the name and bio, prefilled from
 * `profile`, and a password change that happens only when either password field is filled in.
 * Save closes it once saved; Cancel and Android back close it, saving nothing. Like the
 * prototype, it appears without an animation.
 */
export function EditProfile({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const saveProfile = useSaveProfile();
  const [draft, setDraft] = useState<Draft>({ ...profile, currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');

  const set = (field: keyof Draft) => (text: string) => {
    setDraft((current) => ({ ...current, [field]: text }));
    setError('');
  };

  function save() {
    if (saveProfile.isPending) return;
    const problem = validate(draft);
    if (problem) return setError(problem);
    const { name, bio, currentPassword, newPassword } = draft;
    const password = currentPassword || newPassword ? { currentPassword, newPassword } : undefined;
    saveProfile.mutate({ profile: { name, bio }, password }, { onSuccess: onClose, onError: (e) => setError(failureMessage(e)) });
  }

  return (
    <Modal testID="edit-profile" visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <PillButton label="Cancel" size="small" onPress={onClose} />
          <Text style={styles.title}>Edit profile</Text>
          <PillButton label="Save" size="small" onPress={save} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TextField label="Name" value={draft.name} onChangeText={set('name')} autoComplete="name" textContentType="name" />
          <TextField label="Bio" rows={3} placeholder="A line about what you like to read" value={draft.bio} onChangeText={set('bio')} />
          <SectionHeading style={styles.passwordHeading}>Change password</SectionHeading>
          <TextField
            label="Current password"
            value={draft.currentPassword}
            onChangeText={set('currentPassword')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
          />
          <TextField
            label="New password"
            placeholder="At least 6 characters"
            value={draft.newPassword}
            onChangeText={set('newPassword')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          {error !== '' && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.paper },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { ...textStyle(17, 700), lineHeight: 21, color: palette.ink },
  scroll: { flex: 1 },
  content: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  passwordHeading: { paddingTop: 12 },
  error: { ...textStyle(14, 600), lineHeight: 17, color: colors.danger },
});
