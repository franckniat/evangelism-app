import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

export function ProgressRow({
  label,
  pct,
  count,
  color,
}: {
  label: string;
  pct: number;
  count: number;
  color: string;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    label: { width: 96, fontFamily: fonts.regular, fontSize: 12, color: c.text },
    track: { flex: 1, height: 8, borderRadius: 999, backgroundColor: c.muted, overflow: 'hidden' },
    fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
    count: { width: 22, textAlign: 'right', fontFamily: fonts.heading, fontSize: 14, color: c.text },
  });
