import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/ui/Segmented';
import { StackHeader } from '@/components/ui/StackHeader';
import type { Lang } from '@/constants/i18n';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { authenticate, canUseAppLock } from '@/lib/lock';
import type { ThemePref } from '@/lib/types';

export default function SettingsScreen() {
  const { t, lang, setLang, settings, toggleNotif, setAppLock, setThemePref, currentUser } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { showToast } = useToast();
  const router = useRouter();

  const onToggleLock = async (value: boolean) => {
    if (!value) {
      setAppLock(false);
      showToast(t.toast_lock_off);
      return;
    }
    const available = await canUseAppLock();
    if (!available) {
      showToast(t.toast_lock_unavailable);
      return;
    }
    const ok = await authenticate(t.lock_prompt);
    if (ok) {
      setAppLock(true);
      showToast(t.toast_lock_on);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StackHeader title={t.settings_title} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={[styles.h6, styles.h6First]}>{t.settings_theme}</Text>
        <Segmented
          value={settings.themePref}
          onChange={(v: ThemePref) => setThemePref(v)}
          options={[
            { value: 'system', label: t.theme_system },
            { value: 'light', label: t.theme_light },
            { value: 'dark', label: t.theme_dark },
          ]}
        />

        <Text style={styles.h6}>{t.settings_lang}</Text>
        <Segmented
          value={lang}
          onChange={(v: Lang) => setLang(v)}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
          ]}
        />

        <Text style={styles.h6}>{t.settings_notif}</Text>
        <View style={styles.toggleCard}>
          <Feather name="bell" size={19} color={c.accent} />
          <Text style={styles.toggleLabel}>{t.settings_notifdesc}</Text>
          <Switch
            value={settings.notifOn}
            onValueChange={toggleNotif}
            trackColor={{ false: c.track, true: c.accent }}
            thumbColor="#ffffff"
          />
        </View>

        <Text style={styles.h6}>{t.settings_lock}</Text>
        <View style={styles.toggleCard}>
          <Feather name="lock" size={19} color={c.accent} />
          <Text style={styles.toggleLabel}>{t.settings_lockdesc}</Text>
          <Switch
            value={settings.appLock}
            onValueChange={onToggleLock}
            trackColor={{ false: c.track, true: c.accent }}
            thumbColor="#ffffff"
          />
        </View>

        <Text style={styles.h6}>{t.settings_account}</Text>
        <View style={styles.infoCard}>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>{currentUser?.email ? t.profile_email : t.profile_phone}</Text>
            <Text style={styles.infoValue}>{currentUser?.email ?? currentUser?.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t.profile_church}</Text>
            <Text style={styles.infoValue}>{currentUser?.church}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: 20 },
    h6: {
      fontFamily: fonts.heading,
      fontSize: 13,
      color: c.text,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 22,
    },
    h6First: { marginTop: 0 },
    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      padding: 13,
    },
    toggleLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.text },
    infoCard: {
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 13 },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: c.divider },
    infoLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText },
    infoValue: { fontFamily: fonts.semibold, fontSize: 13, color: c.text },
  });
