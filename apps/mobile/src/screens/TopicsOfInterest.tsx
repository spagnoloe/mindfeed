import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSetInterests } from '@/backend/session';
import { FullScreenModal } from '@/design/FullScreenModal';
import { RoundIconButton } from '@/design/RoundIconButton';
import { palette, textStyle } from '@/design/theme';
import { InterestsPicker } from '@/screens/InterestsPicker';

/**
 * Topics of interest, over the whole screen: the user's Interests pressed in among every Topic.
 * Save saves them and closes it, and Home starts over. Back and Android back close it, saving nothing.
 */
export function TopicsOfInterest({ interests, onClose }: { interests: string[]; onClose: () => void }) {
  const setInterests = useSetInterests();

  return (
    <FullScreenModal testID="topics-of-interest" onClose={onClose}>
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
        <InterestsPicker
          initial={interests}
          cta="Save"
          onSave={(topicIds) => {
            if (!setInterests.isPending) setInterests.mutate(topicIds, { onSuccess: onClose });
          }}
        />
      </ScrollView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  content: { flexGrow: 1, paddingTop: 8, paddingHorizontal: 24, paddingBottom: 32, gap: 24 },
  intro: { gap: 10 },
  title: { ...textStyle(34, 700, { lineHeight: 1.02, letterSpacing: -0.035 }), color: palette.ink },
  subtitle: { ...textStyle(18, 400, { lineHeight: 1.45 }), color: palette.ink2 },
});
