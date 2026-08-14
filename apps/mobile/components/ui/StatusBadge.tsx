import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '@/constants/i18n';
import { statusStyle, STATUS_LABEL, type StatusKey } from '@/constants/status';
import { fonts } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

export function StatusBadge({
  statut,
  lang,
  style,
}: {
  statut: StatusKey;
  lang: Lang;
  style?: object;
}) {
  const c = useColors();
  const m = useMemo(() => statusStyle(c, statut), [c, statut]);
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: m.tagBg },
        m.tagBorder ? { borderWidth: 1, borderColor: m.tagBorder } : null,
        style,
      ]}>
      <View style={[styles.dot, { backgroundColor: m.dot }]} />
      <Text style={[styles.label, { color: m.tagFg }]}>{STATUS_LABEL[statut][lang]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, marginRight: 6, borderRadius: 4 },
  label: { fontFamily: fonts.regular, fontSize: 11, letterSpacing: 0.2 },
});
