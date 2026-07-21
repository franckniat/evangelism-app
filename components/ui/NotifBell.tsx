import { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

export function NotifBell({ count, onPress }: { count: number; onPress?: () => void }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} style={styles.btn} hitSlop={8}>
      <Feather name="bell" size={19} color={c.text} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    btn: {
      width: 38,
      height: 38,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -6,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 999,
      paddingHorizontal: 4,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: c.onAccent, fontSize: 10, fontFamily: fonts.heading },
  });
