/**
 * L'état de la synchronisation, en une ligne.
 *
 * Une application qui écrit d'abord localement doit dire quand ce qui est
 * affiché n'est pas encore parti. Sans ce bandeau, un évangéliste qui a saisi
 * dix contacts sans réseau croit son travail à l'abri sur le serveur — et
 * découvre le contraire le jour où il change de téléphone.
 *
 * Rien ne s'affiche quand tout est envoyé : un indicateur permanent finit
 * par ne plus être lu.
 */
import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';

export function SyncBanner() {
  const { t, pending, offline, rejected, syncNow } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (pending === 0 && !offline && !rejected) return null;

  const message = rejected
    ? t.sync_rejected
    : offline
      ? t.sync_offline
      : `${pending} ${t.sync_pending}`;

  return (
    <View style={[styles.bar, rejected && styles.barAlert]}>
      <Feather
        name={rejected ? 'alert-triangle' : offline ? 'cloud-off' : 'upload-cloud'}
        size={14}
        color={rejected ? c.danger : c.mutedText}
      />
      <Text style={[styles.text, rejected && styles.textAlert]} numberOfLines={2}>
        {message}
      </Text>
      {!rejected && (
        <Pressable onPress={() => void syncNow()} hitSlop={8}>
          <Text style={styles.action}>{t.sync_retry}</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: radius.md,
      backgroundColor: c.tagNeutralBg,
    },
    barAlert: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.danger },
    text: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: c.mutedText },
    textAlert: { color: c.danger },
    action: { fontFamily: fonts.semibold, fontSize: 12, color: c.accent },
  });
}
