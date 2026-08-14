import { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, shadow, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';
import { useT } from '@/hooks/useT';

type TabName = 'index' | 'converts' | 'suivi' | 'more';
type FeatherName = React.ComponentProps<typeof Feather>['name'];

export function MoTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useT();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  const items: { name: TabName; label: string; icon: FeatherName }[] = [
    { name: 'index', label: t.nav_home, icon: 'home' },
    { name: 'converts', label: t.nav_converts, icon: 'users' },
    { name: 'suivi', label: t.nav_suivi, icon: 'calendar' },
    { name: 'more', label: t.nav_more, icon: 'menu' },
  ];

  const onPress = (name: TabName) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const focused = activeName === name;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const renderTab = (item: { name: TabName; label: string; icon: FeatherName }) => {
    const focused = activeName === item.name;
    const color = focused ? c.accent : c.iconMuted;
    return (
      <Pressable key={item.name} style={styles.tab} onPress={() => onPress(item.name)}>
        <Feather name={item.icon} size={21} color={color} />
        <Text style={[styles.label, { color }]}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: 66 + insets.bottom }]}>
      {renderTab(items[0])}
      {renderTab(items[1])}
      <View style={styles.fabSlot}>
        <Pressable style={styles.fab} onPress={() => router.push('/add')}>
          <Feather name="plus" size={26} color={c.onAccent} />
        </Pressable>
      </View>
      {renderTab(items[2])}
      {renderTab(items[3])}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderTopWidth: 1,
      borderTopColor: c.divider,
      backgroundColor: c.bg,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    label: { fontFamily: fonts.semibold, fontSize: 10 },
    fabSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fab: {
      width: 52,
      height: 52,
      borderRadius: radius.lg,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateY: -6 }],
      ...shadow.md,
    },
  });
