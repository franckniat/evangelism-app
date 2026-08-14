import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

type Option<T> = { label: string; value: T };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.wrap}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.opt, i > 0 && styles.divider, active && styles.active]}>
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    opt: { paddingVertical: 8, paddingHorizontal: 16 },
    divider: { borderLeftWidth: 1, borderLeftColor: c.divider },
    active: { backgroundColor: c.accent },
    label: { fontFamily: fonts.regular, fontSize: 13, color: c.text },
    labelActive: { color: c.onAccent },
  });
