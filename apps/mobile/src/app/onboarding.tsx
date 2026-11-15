import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTopics } from '@/backend/content';
import { useSetInterests } from '@/backend/session';
import { MIN_INTERESTS } from '@/backend/types';
import { PillButton } from '@/design/PillButton';
import { TopicChip } from '@/design/TopicChip';
import { palette, textStyle } from '@/design/theme';

/** Picking the first Interests. Saving them moves the root layout on to the tabs. */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { data: topics = [] } = useTopics();
  const setInterests = useSetInterests();
  const [selected, setSelected] = useState<string[]>([]);
  const missing = MIN_INTERESTS - selected.length;

  function toggle(topicId: string) {
    setSelected((ids) => (ids.includes(topicId) ? ids.filter((id) => id !== topicId) : [...ids, topicId]));
  }

  function finish() {
    // "Pick N more" looks disabled and, as in the prototype, does nothing.
    if (missing > 0 || setInterests.isPending) return;
    setInterests.mutate(selected);
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>
          What are you curious about?
        </Text>
        <Text style={styles.subtitle}>Pick at least 3 topics. You can change them later in Profile.</Text>
      </View>
      <View style={styles.chips}>
        {topics.map((topic) => (
          <TopicChip key={topic.id} name={topic.name} hue={topic.hue} selected={selected.includes(topic.id)} onToggle={() => toggle(topic.id)} />
        ))}
      </View>
      <View style={styles.fill} />
      <PillButton label={missing > 0 ? `Pick ${missing} more` : 'Continue'} tone="ink" dimmed={missing > 0} onPress={finish} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  intro: { gap: 12 },
  title: { ...textStyle(38, 700, { lineHeight: 1, letterSpacing: -0.04 }), color: palette.ink },
  subtitle: { ...textStyle(18, 400, { lineHeight: 1.45 }), color: palette.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
