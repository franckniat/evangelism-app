import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active]}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: 'transparent',
    },
    active: { backgroundColor: c.accent, borderColor: c.accent },
    label: { fontFamily: fonts.heading, fontSize: 13, color: c.text },
    labelActive: { color: c.onAccent },
  });
