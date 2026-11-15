import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTopics } from '@/backend/content';
import { MIN_INTERESTS } from '@/backend/types';
import { PillButton } from '@/design/PillButton';
import { TopicChip } from '@/design/TopicChip';

/**
 * Picking Interests (onboarding, Topics of interest): every Topic as a chip, pressed in while
 * picked, then a gap and the CTA at the bottom. The CTA reads "Pick N more", looks disabled and,
 * as in the prototype, does nothing until {@link MIN_INTERESTS} are picked; then it reads `cta`
 * and calls `onSave` with the picked Topic ids. It renders as siblings of the caller's content,
 * so the caller's scroll view sets the gaps and lets the gap fill the screen.
 */
export function InterestsPicker({ initial = [], cta, onSave }: { initial?: string[]; cta: string; onSave: (topicIds: string[]) => void }) {
  const { data: topics = [] } = useTopics();
  const [selected, setSelected] = useState(initial);
  const missing = MIN_INTERESTS - selected.length;

  function toggle(topicId: string) {
    setSelected((ids) => (ids.includes(topicId) ? ids.filter((id) => id !== topicId) : [...ids, topicId]));
  }

  return (
    <>
      <View style={styles.chips}>
        {topics.map((topic) => (
          <TopicChip key={topic.id} name={topic.name} hue={topic.hue} selected={selected.includes(topic.id)} onToggle={() => toggle(topic.id)} />
        ))}
      </View>
      <View style={styles.fill} />
      <PillButton label={missing > 0 ? `Pick ${missing} more` : cta} tone="ink" dimmed={missing > 0} onPress={() => missing <= 0 && onSave(selected)} />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fill: { flex: 1 },
});
