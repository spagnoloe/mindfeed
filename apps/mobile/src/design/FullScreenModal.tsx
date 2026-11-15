import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from './PillButton';
import { palette, textStyle } from './theme';

/**
 * A screen over everything, tab bar included: the Stack form, Edit profile and Topics of interest.
 * Android back calls `onClose`. Like the prototype, it appears without an animation.
 */
export function FullScreenModal({ testID, onClose, children }: { testID: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal testID={testID} visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>{children}</View>
    </Modal>
  );
}

/** A form's header: Cancel, the title, and the form's own button (e.g. Save). */
export function FormHeader({ title, onCancel, action }: { title: string; onCancel: () => void; action: ReactNode }) {
  return (
    <View style={styles.header}>
      <PillButton label="Cancel" size="small" onPress={onCancel} />
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.paper },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { ...textStyle(17, 700), lineHeight: 21, color: palette.ink },
});
