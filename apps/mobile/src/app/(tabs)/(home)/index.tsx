import { StyleSheet, Text, View } from 'react-native';

import { palette, textStyle } from '@/design/theme';

/** Home. The feed arrives with the Home feed ticket. */
export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.wordmark}>
          mindfeed.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22, paddingRight: 16 },
  wordmark: { ...textStyle(26, 800, { letterSpacing: -0.045 }), color: palette.ink },
});
