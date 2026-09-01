import { Feather } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StackHeader } from '@/components/ui/StackHeader';
import { fonts, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

type Entree = { id: string; prenom: string; nom: string; tel: string };

/** Sépare un nom complet en prénom / nom quand les champs dédiés manquent. */
function decouper(nomComplet: string): { prenom: string; nom: string } {
  const parts = nomComplet.trim().split(/\s+/);
  if (parts.length <= 1) return { prenom: parts[0] ?? '', nom: '' };
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}

export default function ImportContactsScreen() {
  const { t, importConverts } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { showToast } = useToast();

  const [refuse, setRefuse] = useState(false);
  const [contacts, setContacts] = useState<Entree[]>([]);
  const [recherche, setRecherche] = useState('');
  const [choisis, setChoisis] = useState<Set<string>>(new Set());

  useEffect(() => {
    let actif = true;

    (async () => {
      if (Platform.OS === 'web') {
        setRefuse(true);
        return;
      }
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        if (actif) setRefuse(true);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.FirstName, Contacts.Fields.LastName, Contacts.Fields.PhoneNumbers],
      });

      const entrees: Entree[] = [];
      for (const contact of data) {
        const tel = contact.phoneNumbers?.[0]?.number?.trim();
        if (!tel) continue; // sans numéro, aucun suivi possible

        const prenom = contact.firstName?.trim();
        const nom = contact.lastName?.trim();
        const decoupe = decouper(contact.name ?? '');

        entrees.push({
          id: contact.id ?? tel,
          prenom: prenom || decoupe.prenom,
          nom: nom || decoupe.nom,
          tel,
        });
      }

      entrees.sort((a, b) => a.prenom.localeCompare(b.prenom, 'fr'));
      if (actif) setContacts(entrees);
    })();

    return () => {
      actif = false;
    };
  }, []);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((e) => `${e.prenom} ${e.nom} ${e.tel}`.toLowerCase().includes(q));
  }, [contacts, recherche]);

  const basculer = (id: string) => {
    setChoisis((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  };

  const onImport = () => {
    if (choisis.size === 0) {
      showToast(t.import_none);
      return;
    }
    const n = importConverts(contacts.filter((e) => choisis.has(e.id)));
    showToast(`${n} ${t.import_done}`);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StackHeader title={t.import_title} onBack={() => router.back()} backIcon="x" />

      {refuse ? (
        <View style={styles.center}>
          <Feather name="user-x" size={40} color={c.mutedText} />
          <Text style={styles.centerText}>{t.import_permission}</Text>
        </View>
      ) : (
        <View style={styles.flex}>
          <View style={styles.head}>
            <Text style={styles.sub}>{t.import_sub}</Text>
            <Input
              value={recherche}
              onChangeText={setRecherche}
              placeholder={t.import_search}
              style={styles.search}
            />
            <Text style={styles.consent}>{t.import_consent_note}</Text>
          </View>

          <FlatList
            data={filtres}
            keyExtractor={(e) => e.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t.import_empty}</Text>}
            renderItem={({ item }) => {
              const actif = choisis.has(item.id);
              return (
                <Pressable style={styles.row} onPress={() => basculer(item.id)}>
                  <View style={[styles.box, actif && styles.boxOn]}>
                    {actif && <Feather name="check" size={14} color={c.onAccent} />}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.name}>
                      {item.prenom} {item.nom}
                    </Text>
                    <Text style={styles.tel}>{item.tel}</Text>
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.footer}>
            <Button
              title={`${t.import_action}${choisis.size ? ` (${choisis.size})` : ''}`}
              icon="download"
              block
              height={48}
              disabled={choisis.size === 0}
              onPress={onImport}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
    centerText: { fontFamily: fonts.regular, fontSize: 14, color: c.mutedText, textAlign: 'center', lineHeight: 21 },
    head: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 10 },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: c.mutedText, lineHeight: 20 },
    search: {},
    consent: { fontFamily: fonts.regular, fontSize: 12, color: c.danger },
    list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
    empty: { fontFamily: fonts.regular, fontSize: 14, color: c.mutedText, textAlign: 'center', marginTop: 40 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxOn: { backgroundColor: c.accent, borderColor: c.accent },
    name: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
    tel: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText },
    footer: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.divider },
  });
