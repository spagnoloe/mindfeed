import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { hardShadow, palette, textStyle } from './theme';

const LINE_HEIGHT = 1.45;

export type TextFieldProps = Omit<TextInputProps, 'style' | 'multiline' | 'numberOfLines'> & {
  label: string;
  /** Makes it a textarea of this many lines (the prototype's `rows`). */
  rows?: number;
};

/** A labelled text input, or a textarea with `rows`. Focus gives it an ink border and a hard 3px shadow. */
export function TextField({ label, rows, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const isTextarea = rows !== undefined;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {/* The border and focus shadow sit on a wrapper: changing them on an Android EditText resets its padding. */}
      <View style={[styles.box, focused && styles.focused]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={palette.mut}
          {...inputProps}
          multiline={isTextarea}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, isTextarea ? [styles.textarea, { minHeight: rows * 16 * LINE_HEIGHT + 2 * 14 }] : styles.singleLine]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { ...textStyle(13, 600), color: palette.mut },
  box: { borderWidth: 1.5, borderColor: palette.line2, borderRadius: 16, backgroundColor: palette.card },
  input: { ...textStyle(16, 400), paddingHorizontal: 16, color: palette.ink },
  // 52 tall in the design including the 1.5px border on each side.
  singleLine: { height: 49, paddingVertical: 0 },
  textarea: { ...textStyle(16, 400, { lineHeight: LINE_HEIGHT }), paddingVertical: 14, textAlignVertical: 'top' },
  focused: { borderColor: palette.ink, boxShadow: hardShadow(3) },
});
