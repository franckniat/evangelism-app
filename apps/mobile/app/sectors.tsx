import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
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
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { StackHeader } from '@/components/ui/StackHeader';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

export default function SectorsScreen() {
  const { t, sectors, converts, addSector, updateSector, deleteSector } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { showToast } = useToast();
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState('Cameroun');

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const x of converts) map[x.secteur] = (map[x.secteur] ?? 0) + 1;
    return map;
  }, [converts]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setVille('');
    setPays('Cameroun');
  };

  const onSubmit = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateSector(editingId, name, ville, pays);
      showToast(t.toast_sector_updated);
    } else {
      addSector(name, ville, pays);
      showToast(t.toast_sector);
    }
    resetForm();
  };

  const onEdit = (id: string) => {
    const s = sectors.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setName(s.name);
    setVille(s.ville === '—' ? '' : s.ville);
    setPays(s.pays === '—' ? '' : s.pays);
  };

  const onDelete = (id: string) => {
    Alert.alert(t.confirm_del_sector_title, t.confirm_del_msg, [
      { text: t.a_cancel, style: 'cancel' },
      {
        text: t.a_delete,
        style: 'destructive',
        onPress: () => {
          if (editingId === id) resetForm();
          deleteSector(id);
          showToast(t.toast_sector_deleted);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StackHeader title={t.sectors_title} onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.addCard}>
            <View style={styles.addHead}>
              <Text style={styles.h6}>{editingId ? t.sectors_edit : t.sectors_add}</Text>
              {editingId && (
                <Pressable onPress={resetForm} hitSlop={8}>
                  <Feather name="x" size={16} color={c.mutedText} />
                </Pressable>
              )}
            </View>
            <Field style={styles.field}>
              <Input value={name} onChangeText={setName} placeholder="Akwa, Bonabéri…" />
            </Field>
            <View style={styles.row}>
              <Input value={ville} onChangeText={setVille} placeholder="Douala" style={styles.flex} />
              <Input value={pays} onChangeText={setPays} placeholder="Cameroun" style={styles.flex} />
            </View>
            <Button
              title={editingId ? t.sectors_save : t.sectors_create}
              icon={editingId ? 'check' : 'plus'}
              block
              disabled={!name.trim()}
              onPress={onSubmit}
              style={styles.createBtn}
            />
          </View>

          <View style={styles.list}>
            {sectors.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t.sectors_empty}</Text>
              </View>
            ) : (
              sectors.map((s) => (
                <View key={s.id} style={styles.sectorRow}>
                  <View style={styles.pin}>
                    <Feather name="map-pin" size={19} color={c.accentStrong} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.name}>{s.name}</Text>
                    <Text style={styles.meta}>
                      {s.ville} · {s.pays}
                    </Text>
                  </View>
                  <View style={styles.countBox}>
                    <Text style={styles.count}>{counts[s.name] ?? 0}</Text>
                    <Text style={styles.countLabel}>{t.sectors_members}</Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable style={styles.iconBtn} hitSlop={6} onPress={() => onEdit(s.id)}>
                      <Feather name="edit-2" size={15} color={c.iconMuted} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} hitSlop={6} onPress={() => onDelete(s.id)}>
                      <Feather name="trash-2" size={15} color={c.danger} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1, minWidth: 0 },
    scroll: { padding: 20 },
    addCard: {
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      padding: 14,
    },
    addHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    h6: {
      fontFamily: fonts.heading,
      fontSize: 13,
      color: c.text,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    field: { marginBottom: 9 },
    row: { flexDirection: 'row', gap: 9, marginBottom: 11 },
    createBtn: { marginTop: 0 },
    list: { marginTop: 16, gap: 8 },
    empty: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.divider,
      borderRadius: radius.lg,
      padding: 24,
    },
    emptyText: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText, textAlign: 'center' },
    sectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      padding: 12,
    },
    pin: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { fontFamily: fonts.heading, fontSize: 15, color: c.text },
    meta: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText },
    countBox: { alignItems: 'flex-end' },
    count: { fontFamily: fonts.heading, fontSize: 18, color: c.text },
    countLabel: { fontFamily: fonts.regular, fontSize: 10, color: c.mutedText, textTransform: 'uppercase' },
    rowActions: { flexDirection: 'row', gap: 4 },
    iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  });
