import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StackHeader } from '@/components/ui/StackHeader';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import type { NotifIcon } from '@/lib/types';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const ICON_MAP: Record<NotifIcon, FeatherName> = {
  bell: 'bell',
  alert: 'alert-triangle',
  check: 'check-circle',
  userplus: 'user-plus',
};

export default function NotificationsScreen() {
  const { t, notifications, markNotifRead, markAllRead, clearNotifications } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const onClear = () => {
    Alert.alert(t.confirm_clear_notif_title, t.confirm_del_msg, [
      { text: t.a_cancel, style: 'cancel' },
      { text: t.notif_clear, style: 'destructive', onPress: clearNotifications },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StackHeader
        title={t.notif_title}
        onBack={() => router.back()}
        right={
          notifications.length > 0 ? (
            <View style={styles.headerActions}>
              <Pressable onPress={markAllRead} hitSlop={8}>
                <Text style={styles.markAll}>{t.notif_markall}</Text>
              </Pressable>
              <Pressable onPress={onClear} hitSlop={8}>
                <Feather name="trash-2" size={16} color={c.danger} />
              </Pressable>
            </View>
          ) : undefined
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.notif_empty}</Text>
          </View>
        ) : (
          notifications.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.row, { backgroundColor: n.unread ? c.accentSoft : c.surface }]}
              onPress={() => markNotifRead(n.id)}>
              <View
                style={[styles.icon, { backgroundColor: n.unread ? c.accent : c.notifIconBg }]}>
                <Feather
                  name={ICON_MAP[n.icon]}
                  size={18}
                  color={n.unread ? c.onAccent : c.notifIconFg}
                />
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.text}>{n.text}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
              {n.unread && <View style={styles.dot} />}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    markAll: { fontFamily: fonts.heading, fontSize: 12, color: c.accent },
    scroll: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
    empty: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 24,
    },
    emptyText: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 13,
    },
    icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0 },
    title: { fontFamily: fonts.heading, fontSize: 14, color: c.text },
    text: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText, marginTop: 1 },
    time: { fontFamily: fonts.regular, fontSize: 11, color: c.mutedText, marginTop: 3 },
    dot: { width: 9, height: 9, borderRadius: 999, backgroundColor: c.accent, marginTop: 5 },
  });
