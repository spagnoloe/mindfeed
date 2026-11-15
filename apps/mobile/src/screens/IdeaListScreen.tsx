import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Idea } from '@/backend/types';
import { BackHeader } from '@/design/BackHeader';
import { IdeaRow } from '@/design/IdeaRow';
import { InkPill } from '@/design/InkPill';
import { palette, textStyle } from '@/design/theme';

/**
 * The layout the Topic and Book screens share (the prototype's `rList`): an eyebrow, a title and
 * a muted line, an optional cover beside them, then a row per Idea that opens it.
 */
export function IdeaListScreen({
  eyebrow,
  title,
  subtitle,
  cover,
  ideas,
  rowSubtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cover?: ReactNode;
  ideas: Idea[];
  rowSubtitle: (idea: Idea) => string;
}) {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <BackHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {cover}
          <View style={styles.headText}>
            <InkPill label={eyebrow} variant="eyebrow" />
            <Text accessibilityRole="header" textBreakStrategy="balanced" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.rows}>
          {ideas.map((idea) => (
            <IdeaRow
              key={idea.id}
              title={idea.title}
              subtitle={rowSubtitle(idea)}
              onPress={() => router.push({ pathname: '/idea/[id]', params: { id: idea.id } })}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/** A Topic or Book screen while it loads or after it failed to: just the back button and the status. */
export function IdeaListStatus({ children }: { children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <BackHeader />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingTop: 4, paddingHorizontal: 20, paddingBottom: 32, gap: 22 },
  head: { flexDirection: 'row', gap: 18, alignItems: 'flex-end' },
  headText: { flex: 1, minWidth: 0, gap: 8, alignItems: 'flex-start' },
  title: { ...textStyle(34, 700, { lineHeight: 1.02, letterSpacing: -0.035 }), color: palette.ink },
  subtitle: { ...textStyle(14, 400), lineHeight: 17, color: palette.mut },
  rows: { gap: 10 },
});
