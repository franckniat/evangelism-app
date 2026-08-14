import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { NotifBell } from '@/components/ui/NotifBell';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { STATUS_LABEL, STATUS_ORDER } from '@/constants/status';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { saveToPhone } from '@/lib/contacts';
import { decorateConvert } from '@/lib/view';

export default function ConvertsScreen() {
  const { t, lang, converts, sectors, unreadCount } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { showToast } = useToast();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [sectorFilter, setSectorFilter] = useState<'all' | string>('all');

  const views = useMemo(
    () => converts.map((x) => decorateConvert(x, lang, t, c)),
    [converts, lang, t, c]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return views.filter(
      (v) =>
        (statusFilter === 'all' || v.statut === statusFilter) &&
        (sectorFilter === 'all' || v.secteur === sectorFilter) &&
        (!q || `${v.fullName} ${v.secteur} ${v.tel}`.toLowerCase().includes(q))
    );
  }, [views, search, statusFilter, sectorFilter]);

  const statusChips = [
    { key: 'all', label: t.suivi_all },
    ...STATUS_ORDER.map((k) => ({ key: k as string, label: STATUS_LABEL[k][lang] })),
  ];

  const sectorOptions = [
    { value: 'all', label: t.conv_allsectors },
    ...sectors.map((s) => ({ value: s.name, label: s.name })),
  ];

  const onQuickSave = async (idc: string) => {
    const conv = converts.find((x) => x.id === idc);
    if (!conv) return;
    const ok = await saveToPhone(conv);
    showToast(ok ? t.toast_saved : t.toast_saved_error);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t.conv_title}</Text>
          <NotifBell count={unreadCount} onPress={() => router.push('/notifications')} />
        </View>

        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={c.iconMuted} style={styles.searchIcon} />
          <Input value={search} onChangeText={setSearch} placeholder={t.conv_search} style={styles.searchInput} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {statusChips.map((ch) => (
            <Chip key={ch.key} label={ch.label} active={statusFilter === ch.key} onPress={() => setStatusFilter(ch.key)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.count}>
          {filtered.length} {t.conv_count}
        </Text>
        <View style={styles.selectWrap}>
          <Select value={sectorFilter} options={sectorOptions} onChange={setSectorFilter} compact />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t.conv_empty}</Text>
          </View>
        }
        renderItem={({ item: v }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/convert/${v.id}`)}>
            <Avatar initials={v.initials} size={40} />
            <View style={styles.rowBody}>
              <Text style={styles.name}>{v.fullName}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {v.secteur} · {v.tel}
              </Text>
              <StatusBadge statut={v.statut} lang={lang} style={styles.badge} />
            </View>
            <Pressable style={styles.saveBtn} hitSlop={6} onPress={() => onQuickSave(v.id)}>
              <Feather name="user-plus" size={17} color={c.text} />
            </Pressable>
          </Pressable>
        )}
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: { fontFamily: fonts.heading, fontSize: 23, color: c.text },
    searchWrap: { position: 'relative', justifyContent: 'center' },
    searchIcon: { position: 'absolute', left: 11, zIndex: 1 },
    searchInput: { paddingLeft: 34 },
    chips: { gap: 7, marginTop: 12, paddingRight: 4 },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    count: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText },
    selectWrap: { maxWidth: 200 },
    list: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
    empty: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 24,
      marginTop: 8,
    },
    emptyText: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText, textAlign: 'center' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 11,
      backgroundColor: c.surface,
    },
    rowBody: { flex: 1, minWidth: 0 },
    name: { fontFamily: fonts.heading, fontSize: 15, color: c.text },
    meta: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText },
    badge: { marginTop: 5 },
    saveBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
