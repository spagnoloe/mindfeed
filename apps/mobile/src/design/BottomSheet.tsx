import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from './PillButton';
import { colors, palette, textStyle } from './theme';

/**
 * A sheet over the current screen, with a title and a Done button. Done, a tap outside and
 * Android back all call `onClose`. Like the prototype, it appears without an animation.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      testID="bottom-sheet"
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, styles.backdrop]} />
        <View style={[styles.sheet, { paddingBottom: 28 + insets.bottom }]}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <PillButton label="Done" size="small" onPress={onClose} />
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.backdrop },
  sheet: {
    maxHeight: '80%',
    backgroundColor: palette.paper,
    // Like CSS `border-top` on a rounded box: transparent sides let the ink line follow the corners.
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'transparent',
    borderTopColor: palette.ink,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: palette.line2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingRight: 16, paddingLeft: 22 },
  title: { ...textStyle(22, 700, { letterSpacing: -0.03 }), color: palette.ink },
  body: { flexGrow: 0 },
});
