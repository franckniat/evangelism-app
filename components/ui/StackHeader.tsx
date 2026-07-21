import { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

/** En-tête d'écran empilé : bouton retour + titre + action optionnelle à droite. */
export function StackHeader({
  title,
  onBack,
  backIcon = 'chevron-left',
  right,
}: {
  title: string;
  onBack?: () => void;
  backIcon?: React.ComponentProps<typeof Feather>['name'];
  right?: React.ReactNode;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.header}>
      {onBack && (
        <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
          <Feather name={backIcon} size={18} color={c.text} />
        </Pressable>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: c.bg,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { flex: 1, fontFamily: fonts.heading, fontSize: 15, color: c.text },
    right: { flexDirection: 'row', alignItems: 'center' },
  });
