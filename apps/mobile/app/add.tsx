import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { DatePickerModal } from '@/components/ui/DatePickerModal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { StackHeader } from '@/components/ui/StackHeader';
import { STATUS_LABEL, STATUS_ORDER, type StatusKey } from '@/constants/status';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import type { Sexe } from '@/lib/types';

export default function AddConvertScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, lang, sectors, converts, addConvert, updateConvert } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { showToast } = useToast();
  const router = useRouter();

  const editing = converts.find((x) => x.id === id);

  const [prenom, setPrenom] = useState(editing?.prenom ?? '');
  const [nom, setNom] = useState(editing?.nom ?? '');
  const [tel, setTel] = useState(editing?.tel ?? '');
  const [sexe, setSexe] = useState<Sexe>(editing?.sexe ?? 'H');
  const [secteur, setSecteur] = useState(editing?.secteur ?? '');
  const [statut, setStatut] = useState<StatusKey>(editing?.statut ?? 'reflexion');
  const [notes, setNotes] = useState(editing && editing.notes !== '—' ? editing.notes : '');
  const [firstVisit, setFirstVisit] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * Un dossier a besoin d'un prénom et d'un moyen de recontact. Le nom, le
   * secteur et la première visite ne sont plus obligatoires : imposer un
   * secteur bloquait la saisie tant qu'aucun n'existait.
   */
  const invalid = !prenom.trim() || !tel.trim();

  const sectorOptions = sectors.map((s) => ({ value: s.name, label: s.name }));
  const statusOptions = STATUS_ORDER.map((k) => ({ value: k, label: STATUS_LABEL[k][lang] }));

  const dateVisite = firstVisit
    ? new Date(`${firstVisit}T00:00:00`).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;

  const onSubmit = () => {
    if (invalid) return;
    const fields = { prenom, nom, tel, sexe, secteur, statut, notes };
    if (editing) {
      updateConvert(editing.id, fields);
      showToast(t.toast_updated);
    } else {
      addConvert(fields, { firstVisit });
      showToast(t.toast_added);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StackHeader
        title={editing ? t.add_edit_title : t.add_title}
        onBack={() => router.back()}
        backIcon="x"
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {!editing && (
            <Pressable style={styles.importRow} onPress={() => router.push('/import-contacts')}>
              <Feather name="users" size={18} color={c.accent} />
              <Text style={styles.importText}>{t.import_cta}</Text>
              <Feather name="chevron-right" size={18} color={c.mutedText} />
            </Pressable>
          )}

          <View style={styles.nameRow}>
            <Field label={t.add_prenom} style={styles.flex}>
              <Input value={prenom} onChangeText={setPrenom} placeholder="Marie" />
            </Field>
            <Field label={t.add_nom} style={styles.flex}>
              <Input value={nom} onChangeText={setNom} placeholder="Kamga" />
            </Field>
          </View>

          <Field label={t.add_tel} style={styles.field}>
            <Input value={tel} onChangeText={setTel} keyboardType="phone-pad" placeholder="+237 6 90 00 00 00" />
          </Field>

          <Field label={t.add_sexe} style={styles.field}>
            <Segmented
              value={sexe}
              onChange={setSexe}
              options={[
                { value: 'H', label: t.sexe_h },
                { value: 'F', label: t.sexe_f },
              ]}
            />
          </Field>

          <Field label={t.add_secteur} style={styles.field}>
            {sectors.length === 0 ? (
              <Pressable style={styles.sectorHint} onPress={() => router.push('/sectors')}>
                <Feather name="map-pin" size={16} color={c.mutedText} />
                <Text style={styles.sectorHintText}>{t.no_sectors_cta}</Text>
              </Pressable>
            ) : (
              <Select value={secteur} options={sectorOptions} placeholder={t.add_sector_none} onChange={setSecteur} />
            )}
          </Field>

          <Field label={t.add_statut} style={styles.field}>
            <Select value={statut} options={statusOptions} onChange={(v) => setStatut(v as StatusKey)} />
          </Field>

          {!editing && (
            <Field label={t.add_firstvisit} style={styles.field}>
              <Pressable style={styles.visitRow} onPress={() => setPickerOpen(true)}>
                <Feather name="calendar" size={18} color={c.accent} />
                <Text style={[styles.visitText, !dateVisite && styles.visitMuted]}>
                  {dateVisite ?? t.add_firstvisit_none}
                </Text>
                {firstVisit ? (
                  <Pressable onPress={() => setFirstVisit(null)} hitSlop={8}>
                    <Feather name="x" size={16} color={c.mutedText} />
                  </Pressable>
                ) : (
                  <Text style={styles.visitPick}>{t.plan_pick}</Text>
                )}
              </Pressable>
            </Field>
          )}

          <Field label={t.add_notes} style={styles.fieldLast}>
            <Input value={notes} onChangeText={setNotes} placeholder={t.add_notesph} multiline />
          </Field>

          <Button
            title={editing ? t.add_update : t.add_save}
            icon="check"
            block
            height={46}
            disabled={invalid}
            onPress={onSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={pickerOpen}
        value={firstVisit}
        onSelect={(iso) => {
          setFirstVisit(iso);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
        title={t.plan_title}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    container: { padding: 20 },
    importRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 16,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: c.surface,
    },
    importText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.text },
    nameRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    field: { marginBottom: 14 },
    fieldLast: { marginBottom: 18 },
    sectorHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 42,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.divider,
    },
    sectorHintText: { fontFamily: fonts.regular, fontSize: 14, color: c.mutedText },
    visitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 42,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.divider,
      backgroundColor: c.surface,
    },
    visitText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: c.text },
    visitMuted: { color: c.mutedText },
    visitPick: { fontFamily: fonts.heading, fontSize: 12, color: c.accent },
  });
