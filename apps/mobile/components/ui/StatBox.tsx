import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

export function StatBox({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color?: string;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.box}>
      <Text style={[styles.value, { color: color ?? c.text }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    box: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      paddingVertical: 12,
      paddingHorizontal: 13,
      gap: 2,
    },
    value: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 30 },
    label: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: c.mutedText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
