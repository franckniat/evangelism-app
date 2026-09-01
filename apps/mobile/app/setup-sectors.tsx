import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { Input } from '@/components/ui/Input';
import { fonts, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';

/**
 * Juste après l'inscription : on demande les secteurs où l'on prêche
 * souvent. Ils seront ainsi déjà en place au moment d'enregistrer un
 * converti, au lieu d'obliger à s'interrompre pour les créer.
 *
 * Rien n'est imposé — « Plus tard » mène droit à l'accueil, et le bandeau
 * « aucun secteur » prendra le relais.
 */
export default function SetupSectorsScreen() {
  const { t, sectors, addSector, finishSectorSetup } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const [name, setName] = useState('');
  const [ville, setVille] = useState('');

  const onAdd = () => {
    if (!name.trim()) return;
    addSector(name, ville, '');
    setName('');
    setVille('');
  };

  const onFinish = () => {
    finishSectorSetup();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.icon}>
            <Feather name="map-pin" size={30} color={c.accent} />
          </View>

          <Text style={styles.title}>{t.setup_title}</Text>
          <Text style={styles.sub}>{t.setup_sub}</Text>

          <Input value={name} onChangeText={setName} placeholder={t.setup_name_ph} style={styles.input} />
          <Input value={ville} onChangeText={setVille} placeholder={t.setup_city_ph} style={styles.input} />

          <Button
            title={t.setup_add}
            icon="plus"
            variant="secondary"
            block
            height={44}
            disabled={!name.trim()}
            onPress={onAdd}
            style={styles.addBtn}
          />

          {sectors.length > 0 && (
            <>
              <Text style={styles.listLabel}>{t.setup_added}</Text>
              <View style={styles.list}>
                {sectors.map((s) => (
                  <View key={s.id} style={styles.chip}>
                    <Feather name="map-pin" size={13} color={c.accent} />
                    <Text style={styles.chipText}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.hint}>{t.setup_empty_hint}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button title={t.setup_finish} iconRight="chevron-right" block height={48} onPress={onFinish} />
          <Pressable onPress={onFinish} hitSlop={8} style={styles.skip}>
            <Text style={styles.skipText}>{t.setup_skip}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    container: { padding: 24 },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    title: { fontFamily: fonts.heading, fontSize: 24, color: c.text, marginBottom: 8 },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: c.mutedText, lineHeight: 21, marginBottom: 24 },
    input: { marginBottom: 10 },
    addBtn: { marginTop: 4 },
    listLabel: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: c.mutedText,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: 24,
      marginBottom: 10,
    },
    list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
    },
    chipText: { fontFamily: fonts.semibold, fontSize: 13, color: c.accentStrong },
    hint: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText, marginTop: 24 },
    footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 12 },
    skip: { alignItems: 'center', paddingVertical: 6 },
    skipText: { fontFamily: fonts.semibold, fontSize: 14, color: c.mutedText },
  });
