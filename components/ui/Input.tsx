import { forwardRef, useMemo, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

type Props = TextInputProps & { multiline?: boolean };

export const Input = forwardRef<TextInput, Props>(function Input(
  { style, multiline, onFocus, onBlur, ...rest },
  ref
) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={c.mutedText}
      selectionColor={c.accent}
      multiline={multiline}
      style={[styles.input, multiline && styles.multiline, focused && styles.focused, style]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
});

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    input: {
      width: '100%',
      minHeight: 42,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontFamily: fonts.regular,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.md,
    },
    multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 },
    focused: { borderColor: c.accent },
  });
