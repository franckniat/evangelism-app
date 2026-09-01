/**
 * Un vrai calendrier mensuel, pas une échéance imposée.
 *
 * La planification était figée à trois jours ; on ouvre ici le choix de la
 * date. Un calendrier dessiné à la main (grille de jours, mois précédent /
 * suivant) plutôt que le sélecteur natif : celui-ci se comporte
 * différemment sur iOS, Android et le web, et « un calendrier » est
 * exactement ce qui a été demandé.
 *
 * Les dates passées sont désactivées : on ne planifie pas une visite hier.
 */
import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, shadow, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';
import { toISODate } from '@/lib/dates';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Décalage lundi = 0 … dimanche = 6 pour le premier jour du mois. */
function decalageLundi(annee: number, mois: number): number {
  const jour = new Date(annee, mois, 1).getDay(); // 0 = dimanche
  return (jour + 6) % 7;
}

function memeJour(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  title,
}: {
  visible: boolean;
  /** Date ISO (YYYY-MM-DD) présélectionnée, ou null. */
  value: string | null;
  onSelect: (iso: string) => void;
  onClose: () => void;
  title: string;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const initiale = value ? new Date(`${value}T00:00:00`) : aujourdhui;
  const [curseur, setCurseur] = useState(new Date(initiale.getFullYear(), initiale.getMonth(), 1));

  const annee = curseur.getFullYear();
  const mois = curseur.getMonth();
  const selection = value ? new Date(`${value}T00:00:00`) : null;

  const cases = useMemo(() => {
    const total = new Date(annee, mois + 1, 0).getDate();
    const vide = decalageLundi(annee, mois);
    const grille: (Date | null)[] = Array.from({ length: vide }, () => null);
    for (let j = 1; j <= total; j += 1) grille.push(new Date(annee, mois, j));
    return grille;
  }, [annee, mois]);

  const libelleMois = curseur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // On n'autorise pas de reculer avant le mois courant.
  const peutReculer = annee > aujourdhui.getFullYear() || mois > aujourdhui.getMonth();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.header}>
            <Pressable
              onPress={() => peutReculer && setCurseur(new Date(annee, mois - 1, 1))}
              hitSlop={8}
              style={[styles.nav, !peutReculer && styles.navOff]}
              disabled={!peutReculer}>
              <Feather name="chevron-left" size={20} color={peutReculer ? c.text : c.dotInactive} />
            </Pressable>

            <Text style={styles.month}>
              {libelleMois.charAt(0).toUpperCase() + libelleMois.slice(1)}
            </Text>

            <Pressable
              onPress={() => setCurseur(new Date(annee, mois + 1, 1))}
              hitSlop={8}
              style={styles.nav}>
              <Feather name="chevron-right" size={20} color={c.text} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {JOURS.map((j, i) => (
              <Text key={i} style={styles.weekDay}>
                {j}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cases.map((date, i) => {
              if (!date) return <View key={i} style={styles.cell} />;

              const passe = date < aujourdhui;
              const estAujourdhui = memeJour(date, aujourdhui);
              const choisi = selection != null && memeJour(date, selection);

              return (
                <Pressable
                  key={i}
                  style={styles.cell}
                  disabled={passe}
                  onPress={() => onSelect(toISODate(date))}>
                  <View style={[styles.day, choisi && styles.daySel, estAujourdhui && !choisi && styles.dayToday]}>
                    <Text
                      style={[
                        styles.dayText,
                        passe && styles.dayPast,
                        choisi && styles.dayTextSel,
                      ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 24 },
    sheet: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.divider,
      padding: 16,
      ...shadow.lg,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 16,
      color: c.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    nav: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.muted,
    },
    navOff: { opacity: 0.4 },
    month: { fontFamily: fonts.semibold, fontSize: 15, color: c.text },
    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekDay: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.regular,
      fontSize: 12,
      color: c.mutedText,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    day: {
      width: 38,
      height: 38,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySel: { backgroundColor: c.accent },
    dayToday: { borderWidth: 1, borderColor: c.accent },
    dayText: { fontFamily: fonts.regular, fontSize: 14, color: c.text },
    dayTextSel: { fontFamily: fonts.heading, color: c.onAccent },
    dayPast: { color: c.dotInactive },
  });
