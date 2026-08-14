import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { NotifBell } from '@/components/ui/NotifBell';
import { ProgressRow } from '@/components/ui/ProgressRow';
import { StatBox } from '@/components/ui/StatBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { statusStyle, STATUS_LABEL, STATUS_ORDER } from '@/constants/status';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { decorateConvert } from '@/lib/view';

export default function HomeScreen() {
  const { t, lang, converts, sectors, currentUser, unreadCount, toggleTask } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const views = useMemo(
    () => converts.map((x) => decorateConvert(x, lang, t, c)),
    [converts, lang, t, c]
  );

  const stats = useMemo(() => {
    const toVisit = views.filter((v) => v.state !== 'done').length;
    const bapt = converts.filter((x) => x.statut === 'baptise').length;
    return [
      { value: toVisit, label: t.stat_visit, color: c.accent },
      { value: converts.length, label: t.stat_conv, color: c.text },
      { value: bapt, label: t.stat_bapt, color: c.text },
      { value: sectors.length, label: t.stat_sect, color: c.text },
    ];
  }, [views, converts, sectors.length, t, c]);

  const statusCounts = useMemo(() => {
    const total = converts.length || 1;
    return STATUS_ORDER.map((k) => {
      const n = converts.filter((x) => x.statut === k).length;
      return { key: k, label: STATUS_LABEL[k][lang], count: n, pct: Math.round((n / total) * 100), color: statusStyle(c, k).dot };
    });
  }, [converts, lang, c]);

  const todayTasks = useMemo(
    () =>
      views
        .filter((v) => (v.state === 'todo' && v.dueLabelText === t.due_today) || v.state === 'late')
        .slice(0, 3),
    [views, t.due_today]
  );

  const recent = views.slice(0, 3);
  const firstName = currentUser?.name.split(' ')[0] ?? '';

  const SectionTitle = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.hi}>
            {t.home_hi}, {firstName}
          </Text>
          <Text style={styles.title}>{t.home_title}</Text>
        </View>
        <NotifBell count={unreadCount} onPress={() => router.push('/notifications')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatBox {...stats[0]} />
            <StatBox {...stats[1]} />
          </View>
          <View style={styles.statsRow}>
            <StatBox {...stats[2]} />
            <StatBox {...stats[3]} />
          </View>
        </View>

        <SectionTitle title={t.home_today} action={t.a_viewall} onAction={() => router.push('/suivi')} />
        <View style={styles.list}>
          {todayTasks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t.home_notoday}</Text>
            </View>
          ) : (
            todayTasks.map((v) => (
              <Pressable key={v.id} style={styles.taskRow} onPress={() => router.push(`/convert/${v.id}`)}>
                <View style={[styles.taskBar, { backgroundColor: v.dueColorVal }]} />
                <View style={styles.flex}>
                  <Text style={styles.taskName}>{v.fullName}</Text>
                  <Text style={styles.taskMeta}>
                    {v.secteur} · {v.dueLabelText}
                  </Text>
                </View>
                <Pressable style={styles.checkBtn} hitSlop={6} onPress={() => toggleTask(v.id)}>
                  <Feather name="check" size={16} color={c.text} />
                </Pressable>
              </Pressable>
            ))
          )}
        </View>

        <SectionTitle title={t.home_bystatus} />
        <View style={styles.statusCard}>
          {statusCounts.map((sc) => (
            <ProgressRow key={sc.key} label={sc.label} pct={sc.pct} count={sc.count} color={sc.color} />
          ))}
        </View>

        <SectionTitle title={t.home_recent} action={t.a_viewall} onAction={() => router.push('/converts')} />
        <View style={styles.list}>
          {recent.map((v) => (
            <Pressable key={v.id} style={styles.convRow} onPress={() => router.push(`/convert/${v.id}`)}>
              <Avatar initials={v.initials} size={38} />
              <View style={styles.flex}>
                <Text style={styles.taskName}>{v.fullName}</Text>
                <Text style={styles.taskMeta}>{v.secteur}</Text>
              </View>
              <StatusBadge statut={v.statut} lang={lang} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1, minWidth: 0 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    hi: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: c.mutedText,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    title: { fontFamily: fonts.heading, fontSize: 23, color: c.text, marginTop: 2 },
    scroll: { paddingBottom: 24 },
    statsGrid: { paddingHorizontal: 20, paddingTop: 16, gap: 10 },
    statsRow: { flexDirection: 'row', gap: 10 },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 22,
    },
    sectionTitle: {
      fontFamily: fonts.heading,
      fontSize: 14,
      color: c.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionAction: { fontFamily: fonts.heading, fontSize: 12, color: c.accent },
    list: { paddingHorizontal: 20, paddingTop: 10, gap: 8 },
    empty: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 18,
    },
    emptyText: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText, textAlign: 'center' },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 11,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    taskBar: { width: 8, height: 34 },
    taskName: { fontFamily: fonts.heading, fontSize: 15, color: c.text },
    taskMeta: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText, marginTop: 1 },
    checkBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusCard: {
      marginHorizontal: 20,
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 4,
    },
    convRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 10,
      backgroundColor: c.surface,
    },
  });
