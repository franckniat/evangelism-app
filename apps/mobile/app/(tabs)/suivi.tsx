import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import type { TaskState } from '@/lib/dates';
import { decorateConvert } from '@/lib/view';

type Filter = 'all' | TaskState;

export default function SuiviScreen() {
  const { t, lang, converts, toggleTask } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  const views = useMemo(
    () => converts.map((x) => decorateConvert(x, lang, t, c)),
    [converts, lang, t, c]
  );
  const filtered = useMemo(
    () => views.filter((v) => filter === 'all' || v.state === filter),
    [views, filter]
  );

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: t.suivi_all },
    { key: 'todo', label: t.suivi_todo },
    { key: 'late', label: t.suivi_late },
    { key: 'done', label: t.suivi_done },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.suivi_title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chips.map((ch) => (
            <Chip key={ch.key} label={ch.label} active={filter === ch.key} onPress={() => setFilter(ch.key)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.suivi_empty}</Text>
          </View>
        }
        renderItem={({ item: v }) => {
          const done = v.state === 'done';
          return (
            <View style={styles.row}>
              <View style={[styles.bar, { backgroundColor: v.dueColorVal }]} />
              <Pressable style={styles.body} onPress={() => router.push(`/convert/${v.id}`)}>
                <View style={styles.titleLine}>
                  <Text style={styles.name}>{v.fullName}</Text>
                  <Text style={[styles.due, { color: v.dueColorVal }]}>{v.dueLabelText}</Text>
                </View>
                <Text style={styles.meta}>
                  {v.secteur} · {v.statutLabel}
                </Text>
              </Pressable>
              <Pressable style={[styles.toggle, done && styles.toggleDone]} onPress={() => toggleTask(v.id)}>
                <Feather name="check" size={18} color={done ? c.onAccent : c.iconMuted} />
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    title: { fontFamily: fonts.heading, fontSize: 23, color: c.text, marginBottom: 12 },
    chips: { gap: 7, paddingRight: 4 },
    list: { paddingHorizontal: 20, paddingVertical: 14, gap: 9 },
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
      alignItems: 'stretch',
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    bar: { width: 8 },
    body: { flex: 1, paddingVertical: 12, paddingHorizontal: 13, minWidth: 0 },
    titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontFamily: fonts.heading, fontSize: 15, color: c.text },
    due: { fontFamily: fonts.semibold, fontSize: 11 },
    meta: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText, marginTop: 2 },
    toggle: {
      width: 48,
      borderLeftWidth: 1,
      borderLeftColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleDone: { backgroundColor: c.accent },
  });
