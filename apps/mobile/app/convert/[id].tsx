import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { StackHeader } from '@/components/ui/StackHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { STATUS_LABEL, STATUS_ORDER } from '@/constants/status';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { saveToPhone } from '@/lib/contacts';
import { decorateConvert } from '@/lib/view';

export default function ConvertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang, converts, setStatus, planVisit, deleteConvert, loadConvertHistory } = useApp();
  const cols = useColors();
  const styles = useMemo(() => makeStyles(cols), [cols]);
  const { showToast } = useToast();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * Le fil d'activité n'accompagne pas la liste — cinquante entrées par
   * dossier, pour un écran qui n'en montre qu'un. Il est donc chargé ici,
   * à l'ouverture de la fiche. Avant ce hook, aucun retour anticipé : les
   * hooks doivent s'exécuter dans le même ordre à chaque rendu.
   */
  useEffect(() => {
    if (id) void loadConvertHistory(id);
  }, [id, loadConvertHistory]);

  const convert = converts.find((x) => x.id === id);

  if (!convert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StackHeader title={t.detail_title} onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  const c = decorateConvert(convert, lang, t, cols);

  const onCall = () => Linking.openURL('tel:' + c.tel.replace(/\s/g, ''));
  const onSave = async () => {
    const ok = await saveToPhone(convert);
    showToast(ok ? t.toast_saved : t.toast_saved_error);
  };
  const onSetStatus = (key: (typeof STATUS_ORDER)[number]) => {
    setStatus(c.id, key);
    showToast(t.toast_status);
  };
  const onPickDate = async (iso: string) => {
    setPickerOpen(false);
    await planVisit(c.id, iso);
    showToast(t.toast_visit);
  };
  const onDelete = () => {
    Alert.alert(t.confirm_del_convert_title, t.confirm_del_msg, [
      { text: t.a_cancel, style: 'cancel' },
      {
        text: t.a_delete,
        style: 'destructive',
        onPress: () => {
          deleteConvert(c.id);
          showToast(t.toast_deleted);
          router.back();
        },
      },
    ]);
  };
  const onEdit = () => router.push({ pathname: '/add', params: { id: c.id } });

  const InfoRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StackHeader
        title={t.detail_title}
        onBack={() => router.back()}
        right={
          <Pressable style={styles.headerEdit} onPress={onEdit} hitSlop={8}>
            <Feather name="edit-2" size={16} color={cols.text} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Avatar initials={c.initials} size={60} fontSize={22} />
          <View style={styles.flex}>
            <Text style={styles.name}>{c.fullName}</Text>
            <StatusBadge statut={c.statut} lang={lang} />
          </View>
        </View>

        <View style={styles.actions}>
          <Button title={t.a_call} icon="phone" variant="secondary" onPress={onCall} align="flex-start" height={44} style={styles.callBtn} />
          <Button title={t.a_savephone} icon="user-plus" onPress={onSave} align="flex-start" height={44} style={styles.saveBtn} />
        </View>

        <Text style={styles.h6}>{t.detail_info}</Text>
        <View style={styles.infoCard}>
          <InfoRow label={t.detail_phone} value={c.tel} />
          <InfoRow label={t.detail_sexe} value={c.sexeLabel} />
          <InfoRow label={t.detail_sector} value={c.secteur} />
          <InfoRow label={t.detail_added} value={c.added} last />
        </View>

        <Text style={styles.h6}>{t.detail_changestatus}</Text>
        <View style={styles.chips}>
          {STATUS_ORDER.map((k) => (
            <Chip key={k} label={STATUS_LABEL[k][lang]} active={c.statut === k} onPress={() => onSetStatus(k)} />
          ))}
        </View>

        <Text style={styles.h6}>{t.detail_next}</Text>
        <Pressable style={styles.nextCard} onPress={() => setPickerOpen(true)}>
          <Feather name="calendar" size={20} color={cols.accent} />
          <Text style={styles.nextLabel}>{c.nextVisit ? c.dueLabelText : t.detail_novisit}</Text>
          <Text style={styles.planLink}>{t.plan_pick}</Text>
        </Pressable>

        <DatePickerModal
          visible={pickerOpen}
          value={c.nextVisit}
          onSelect={onPickDate}
          onClose={() => setPickerOpen(false)}
          title={t.plan_title}
        />

        <Text style={styles.h6}>{t.detail_notes}</Text>
        <Text style={styles.notes}>{c.notes}</Text>

        <Text style={styles.h6}>{t.detail_timeline}</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {c.history.map((h, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineDate}>{h.date}</Text>
              <Text style={styles.timelineText}>{h.text}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Feather name="trash-2" size={17} color={cols.danger} />
          <Text style={styles.deleteText}>{t.a_delete}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1, minWidth: 0, gap: 4 },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    headerEdit: {
      width: 36,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 28,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      borderRadius: radius.lg,
      paddingVertical: 13,
    },
    deleteText: { fontFamily: fonts.heading, fontSize: 14, color: c.danger },
    hero: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 22 },
    name: { fontFamily: fonts.heading, fontSize: 22, color: c.text },
    actions: { flexDirection: 'row', gap: 8, paddingTop: 18 },
    callBtn: { flex: 1 },
    saveBtn: { flex: 1.4 },
    h6: {
      fontFamily: fonts.heading,
      fontSize: 13,
      color: c.text,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 22,
      marginBottom: 8,
    },
    infoCard: {
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingHorizontal: 13,
    },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
    infoLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText },
    infoValue: { fontFamily: fonts.semibold, fontSize: 13, color: c.text },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    nextCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      paddingVertical: 12,
      paddingHorizontal: 13,
    },
    nextLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: c.text },
    planLink: { fontFamily: fonts.heading, fontSize: 12, color: c.accent },
    notes: {
      fontFamily: fonts.regular,
      fontSize: 13,
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 13,
    },
    timeline: { position: 'relative', paddingLeft: 22 },
    timelineLine: {
      position: 'absolute',
      left: 5,
      top: 4,
      bottom: 4,
      width: 2,
      backgroundColor: c.divider,
    },
    timelineItem: { position: 'relative', marginBottom: 16 },
    timelineDot: {
      position: 'absolute',
      left: -22,
      top: 3,
      width: 12,
      height: 12,
      backgroundColor: c.accent,
      borderWidth: 2,
      borderColor: c.bg,
    },
    timelineDate: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: c.mutedText,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    timelineText: { fontFamily: fonts.regular, fontSize: 13, color: c.text, marginTop: 2 },
  });
