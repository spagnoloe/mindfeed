import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { RoundIconButton } from './RoundIconButton';

/** The header of a screen deeper in a tab: a round back button, and optional actions on the right. */
export function BackHeader({ actions }: { actions?: ReactNode }) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <RoundIconButton icon="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} />
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  actions: { flexDirection: 'row', gap: 8 },
});
