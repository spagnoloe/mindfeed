import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTopics } from '@/backend/content';
import { useSetInterests } from '@/backend/session';
import { MIN_INTERESTS } from '@/backend/types';
import { PillButton } from '@/design/PillButton';
import { RoundIconButton } from '@/design/RoundIconButton';
import { TopicChip } from '@/design/TopicChip';
import { palette, textStyle } from '@/design/theme';

/**
 * Topics of interest, covering the whole screen, tab bar included: every Topic as a chip, with
 * the user's Interests pressed in. The CTA reads "Pick N more" and does nothing until
 * {@link MIN_INTERESTS} are picked; then Save saves them and closes it, and Home starts over.
 * Back and Android back close it, saving nothing. Like the prototype, it appears without an animation.
 */
export function TopicsOfInterest({ interests, onClose }: { interests: string[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data: topics = [] } = useTopics();
  const setInterests = useSetInterests();
  const [selected, setSelected] = useState(interests);
  const missing = MIN_INTERESTS - selected.length;

  function toggle(topicId: string) {
    setSelected((ids) => (ids.includes(topicId) ? ids.filter((id) => id !== topicId) : [...ids, topicId]));
  }

  function save() {
    if (missing > 0 || setInterests.isPending) return;
    setInterests.mutate(selected, { onSuccess: onClose });
  }

  return (
    <Modal testID="topics-of-interest" visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <RoundIconButton icon="arrow_back" accessibilityLabel="Back" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.title}>
              Topics of interest
            </Text>
            <Text style={styles.subtitle}>Your Home feed is built from these. Keep at least 3.</Text>
          </View>
          <View style={styles.chips}>
            {topics.map((topic) => (
              <TopicChip key={topic.id} name={topic.name} hue={topic.hue} selected={selected.includes(topic.id)} onToggle={() => toggle(topic.id)} />
            ))}
          </View>
          <View style={styles.fill} />
          <PillButton label={missing > 0 ? `Pick ${missing} more` : 'Save'} tone="ink" dimmed={missing > 0} onPress={save} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.paper },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  content: { flexGrow: 1, paddingTop: 8, paddingHorizontal: 24, paddingBottom: 32, gap: 24 },
  intro: { gap: 10 },
  title: { ...textStyle(34, 700, { lineHeight: 1.02, letterSpacing: -0.035 }), color: palette.ink },
  subtitle: { ...textStyle(18, 400, { lineHeight: 1.45 }), color: palette.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fill: { flex: 1 },
});
