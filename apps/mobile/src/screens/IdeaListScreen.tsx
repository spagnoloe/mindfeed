import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Idea } from '@/backend/types';
import { BackHeader } from '@/design/BackHeader';
import { IdeaRow, type IdeaRowAction } from '@/design/IdeaRow';
import { InkPill } from '@/design/InkPill';
import { palette, textStyle } from '@/design/theme';
import { useOpenInTab } from '@/navigation/useOpenInTab';

/**
 * The layout the Topic, Book and Stack screens share (the prototype's `rList`): an eyebrow, a
 * title, an optional description and a muted line, an optional cover beside them, then a row per
 * Idea that opens it, or `empty` when there are none. A Stack adds header actions and a button on
 * each row.
 */
export function IdeaListScreen({
  eyebrow,
  title,
  description,
  subtitle,
  cover,
  headerActions,
  ideas,
  rowSubtitle,
  rowAction,
  empty,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  subtitle: string;
  cover?: ReactNode;
  headerActions?: ReactNode;
  ideas: Idea[];
  rowSubtitle: (idea: Idea) => string;
  rowAction?: (idea: Idea) => IdeaRowAction;
  empty?: string;
}) {
  const { openIdea } = useOpenInTab();

  return (
    <View style={styles.screen}>
      <BackHeader actions={headerActions} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {cover}
          <View style={styles.headText}>
            <InkPill label={eyebrow} variant="eyebrow" />
            <Text accessibilityRole="header" textBreakStrategy="balanced" style={styles.title}>
              {title}
            </Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        {ideas.length === 0 && empty !== undefined && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{empty}</Text>
          </View>
        )}
        <View style={styles.rows}>
          {ideas.map((idea) => (
            <IdeaRow
              key={idea.id}
              title={idea.title}
              subtitle={rowSubtitle(idea)}
              onPress={() => openIdea(idea.id)}
              action={rowAction?.(idea)}
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
  description: { ...textStyle(17, 400, { lineHeight: 1.5 }), color: palette.ink2 },
  subtitle: { ...textStyle(14, 400), lineHeight: 17, color: palette.mut },
  empty: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.line2,
    borderRadius: 22,
  },
  emptyText: { ...textStyle(16, 400, { lineHeight: 1.45 }), color: palette.mut, textAlign: 'center' },
  rows: { gap: 10 },
});
