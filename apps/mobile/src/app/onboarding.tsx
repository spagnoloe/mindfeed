import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSetInterests } from '@/backend/session';
import { palette, textStyle } from '@/design/theme';
import { InterestsPicker } from '@/screens/InterestsPicker';

/** Picking the first Interests. Saving them moves the root layout on to the tabs. */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const setInterests = useSetInterests();

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>
          What are you curious about?
        </Text>
        <Text style={styles.subtitle}>Pick at least 3 topics. You can change them later in Profile.</Text>
      </View>
      <InterestsPicker
        cta="Continue"
        onSave={(topicIds) => {
          if (!setInterests.isPending) setInterests.mutate(topicIds);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  intro: { gap: 12 },
  title: { ...textStyle(38, 700, { lineHeight: 1, letterSpacing: -0.04 }), color: palette.ink },
  subtitle: { ...textStyle(18, 400, { lineHeight: 1.45 }), color: palette.ink2 },
});
