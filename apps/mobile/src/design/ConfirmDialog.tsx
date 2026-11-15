import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PillButton } from './PillButton';
import { colors, hardShadow, palette, type } from './theme';

/**
 * A centred confirmation dialog with Cancel and a red confirming button. Cancel, a tap outside
 * and Android back all call `onCancel`. Like the prototype, it appears without an animation.
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      testID="confirm-dialog"
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.centre}>
        <Pressable accessibilityLabel="Close" onPress={onCancel} style={[StyleSheet.absoluteFill, styles.backdrop]} />
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>
            <PillButton label="Cancel" size="dialog" onPress={onCancel} style={styles.action} />
            <PillButton label={confirmLabel} size="dialog" tone="danger" weight={700} onPress={onConfirm} style={styles.action} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  backdrop: { backgroundColor: colors.backdrop },
  card: {
    width: '100%',
    maxWidth: 330,
    gap: 10,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.ink,
    borderRadius: 26,
    boxShadow: hardShadow(4),
  },
  title: { ...type(20, 700, { lineHeight: 1.15, letterSpacing: -0.02 }), color: palette.ink },
  body: { ...type(17, 400, { lineHeight: 1.45 }), color: palette.ink2 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  action: { flex: 1 },
});
