import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PillButton } from './PillButton';
import { palette, textStyle } from './theme';

/**
 * Fills a screen while its content loads, or after it failed to, with a way to try again. The
 * prototype has neither state; this follows its empty states' muted, centred text.
 */
export function ScreenStatus({ error, onRetry }: { error?: boolean; onRetry?: () => void }) {
  return (
    <View style={styles.screen}>
      {error ? (
        <>
          <Text style={styles.message}>Couldn’t load this. Check your connection and try again.</Text>
          {onRetry && <PillButton label="Try again" size="medium" onPress={onRetry} style={styles.retry} />}
        </>
      ) : (
        <ActivityIndicator accessibilityLabel="Loading" color={palette.ink} size="large" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  message: { ...textStyle(16, 400, { lineHeight: 1.45 }), color: palette.mut, textAlign: 'center' },
  retry: { alignSelf: 'stretch' },
});
