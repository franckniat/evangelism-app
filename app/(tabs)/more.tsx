import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { initials } from '@/lib/view';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export default function MoreScreen() {
  const { t, currentUser, logout } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const menu: { key: string; label: string; icon: FeatherName; onPress: () => void }[] = [
    { key: 'sectors', label: t.more_sectors, icon: 'map-pin', onPress: () => router.push('/sectors') },
    { key: 'notif', label: t.more_notif, icon: 'bell', onPress: () => router.push('/notifications') },
    { key: 'settings', label: t.more_settings, icon: 'sliders', onPress: () => router.push('/settings') },
  ];

  const nameParts = (currentUser?.name ?? '').split(' ');
  const ini = initials({ prenom: nameParts[0] ?? '', nom: nameParts[1] ?? '' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.more_title}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Pressable style={styles.profile} onPress={() => router.push('/profile')}>
          <Avatar initials={ini} uri={currentUser?.photoUri} size={52} bg={c.accent} fontSize={19} />
          <View style={styles.flex}>
            <Text style={styles.name}>{currentUser?.name}</Text>
            <Text style={styles.email}>{currentUser?.email ?? currentUser?.phone}</Text>
            {!!currentUser?.church && <Text style={styles.church}>{currentUser.church}</Text>}
          </View>
          <Feather name="chevron-right" size={18} color={c.iconMuted} />
        </Pressable>

        <View style={styles.menu}>
          {menu.map((m, i) => (
            <Pressable
              key={m.key}
              style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && styles.pressed]}
              onPress={m.onPress}>
              <Feather name={m.icon} size={19} color={c.accent} />
              <Text style={styles.itemLabel}>{m.label}</Text>
              <Feather name="chevron-right" size={17} color={c.iconMuted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Feather name="log-out" size={18} color={c.accent} />
          <Text style={styles.logoutText}>{t.more_logout}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1, minWidth: 0 },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    title: { fontFamily: fonts.heading, fontSize: 23, color: c.text },
    scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 },
    profile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      padding: 16,
    },
    name: { fontFamily: fonts.heading, fontSize: 17, color: c.text },
    email: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText },
    church: { fontFamily: fonts.regular, fontSize: 12, color: c.accentStrong, marginTop: 3 },
    menu: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 13 },
    itemBorder: { borderTopWidth: 1, borderTopColor: c.divider },
    pressed: { backgroundColor: c.pressed },
    itemLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.text },
    logoutBtn: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      paddingVertical: 13,
    },
    logoutText: { fontFamily: fonts.heading, fontSize: 14, color: c.accent },
  });
