import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

export function Field({
  label,
  children,
  style,
}: {
  label?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    label: {
      fontFamily: fonts.regular,
      fontSize: 12,
      marginBottom: 5,
      color: c.mutedText,
    },
  });
