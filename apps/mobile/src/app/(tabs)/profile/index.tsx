import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTopics } from '@/backend/content';
import { useProfile } from '@/backend/profile';
import { useInterests, useLogOut, useSession } from '@/backend/session';
import { ConfirmDialog } from '@/design/ConfirmDialog';
import { ScreenTitle } from '@/design/headings';
import { Icon, type IconName } from '@/design/Icon';
import { PillButton } from '@/design/PillButton';
import { ScreenStatus } from '@/design/ScreenStatus';
import { hardShadow, palette, textStyle } from '@/design/theme';
import { tabScreenContent } from '@/navigation/tabScreenContent';
import { EditProfile } from '@/screens/EditProfile';
import { TopicsOfInterest } from '@/screens/TopicsOfInterest';

/** The prototype's initials: the first letter of the first two words, capitalised. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Profile: who is signed in, and the ways to change their profile and Interests. */
export default function ProfileScreen() {
  const { data: session } = useSession();
  const profile = useProfile();
  const interests = useInterests(session?.userId);
  const { data: topics = [] } = useTopics();
  const logOut = useLogOut();
  const [open, setOpen] = useState<'edit' | 'interests' | 'logOut' | null>(null);
  const close = () => setOpen(null);

  // The Interests in Topic order: the Backend keeps no order of its own.
  const interestsSummary = topics
    .filter((topic) => interests.data?.includes(topic.id))
    .map((topic) => topic.name)
    .join(', ');

  return (
    <ScrollView contentContainerStyle={[tabScreenContent, styles.content]} showsVerticalScrollIndicator={false}>
      <ScreenTitle>profile.</ScreenTitle>
      {profile.isPending ? (
        <ScreenStatus />
      ) : profile.isError ? (
        <ScreenStatus error onRetry={() => void profile.refetch()} />
      ) : (
        <>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{initials(profile.data.name)}</Text>
            </View>
            <View style={styles.names}>
              <Text style={styles.name}>{profile.data.name}</Text>
              <Text style={styles.email}>{session?.email}</Text>
            </View>
          </View>
          {profile.data.bio !== '' && <Text style={styles.bio}>{profile.data.bio}</Text>}
          <View style={styles.rows}>
            <ProfileRow icon="edit" title="Edit profile" detail="Name, bio, password" divider onPress={() => setOpen('edit')} />
            <ProfileRow icon="interests" title="Topics of interest" detail={interestsSummary} onPress={() => setOpen('interests')} />
          </View>
          <PillButton label="Log out" tone="accent" size="medium" onPress={() => setOpen('logOut')} />
          <ConfirmDialog
            visible={open === 'logOut'}
            title="Log out of Mindfeed?"
            body="Your liked ideas and stacks are saved to your account."
            confirmLabel="Log out"
            onConfirm={() => {
              close();
              if (session) logOut.mutate(session.email);
            }}
            onCancel={close}
          />
          {open === 'edit' && <EditProfile profile={profile.data} onClose={close} />}
          {open === 'interests' && interests.data && <TopicsOfInterest interests={interests.data} onClose={close} />}
        </>
      )}
    </ScrollView>
  );
}

/** A row of the Profile card. No press effect: while touched it shows the prototype's hover background. */
function ProfileRow({
  icon,
  title,
  detail,
  divider = false,
  onPress,
}: {
  icon: IconName;
  title: string;
  detail: string;
  divider?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.rowPressed]}
    >
      <Icon name={icon} size={22} color={palette.mut} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Icon name="chevron_right" size={20} color={palette.mut} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: palette.ink,
    backgroundColor: palette.acc,
    boxShadow: hardShadow(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...textStyle(28, 800, { letterSpacing: -0.03 }), color: palette.ink },
  names: { flex: 1, minWidth: 0, gap: 3 },
  name: { ...textStyle(26, 700, { lineHeight: 1.05, letterSpacing: -0.03 }), color: palette.ink },
  // The design's `line-height: normal`, as the browser renders it (see TextField's label).
  email: { ...textStyle(14, 400), lineHeight: 17, color: palette.mut },
  bio: { ...textStyle(18, 400, { lineHeight: 1.5 }), color: palette.ink2 },
  rows: { backgroundColor: palette.card, borderWidth: 1.5, borderColor: palette.line, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: palette.line },
  rowPressed: { backgroundColor: palette.hover },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { ...textStyle(16, 600), lineHeight: 20, color: palette.ink },
  rowDetail: { ...textStyle(13, 400), lineHeight: 16, color: palette.mut },
});
