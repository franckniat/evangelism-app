import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { StackHeader } from '@/components/ui/StackHeader';
import { STATUS_LABEL, STATUS_ORDER, type StatusKey } from '@/constants/status';
import { type AppColors } from '@/constants/theme';
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

  const invalid = !prenom.trim() || !nom.trim() || !tel.trim() || !secteur;

  const sectorOptions = sectors.map((s) => ({ value: s.name, label: s.name }));
  const statusOptions = STATUS_ORDER.map((k) => ({ value: k, label: STATUS_LABEL[k][lang] }));

  const onSubmit = () => {
    if (invalid) return;
    const fields = { prenom, nom, tel, sexe, secteur, statut, notes };
    if (editing) {
      updateConvert(editing.id, fields);
      showToast(t.toast_updated);
    } else {
      addConvert(fields);
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
            <Select value={secteur} options={sectorOptions} placeholder={t.add_choose} onChange={setSecteur} />
          </Field>

          <Field label={t.add_statut} style={styles.field}>
            <Select value={statut} options={statusOptions} onChange={(v) => setStatut(v as StatusKey)} />
          </Field>

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
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    container: { padding: 20 },
    nameRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    field: { marginBottom: 14 },
    fieldLast: { marginBottom: 18 },
  });
