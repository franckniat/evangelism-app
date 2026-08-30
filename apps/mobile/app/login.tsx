import { Feather } from '@expo/vector-icons';
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
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';

export default function LoginScreen() {
  const { t, lang, setLang, login } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    setError(null);
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (!res.ok) {
      /**
       * Un serveur injoignable et un mot de passe faux appellent des gestes
       * différents. Les confondre sous « identifiants incorrects » enverrait
       * quelqu'un retaper indéfiniment un mot de passe correct.
       */
      setError(res.error === 'offline' ? t.login_offline : t.login_error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Feather name="plus" size={24} color={c.onAccent} />
            </View>
            <Text style={styles.brand}>MOISSON</Text>
          </View>
          <Text style={styles.sub}>{t.login_sub}</Text>

          <Text style={styles.title}>{t.login_title}</Text>

          <Field label={t.login_email} style={styles.field}>
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="jean@exemple.cm"
            />
          </Field>
          <Field label={t.login_pass} style={styles.fieldTight}>
            <Input value={password} onChangeText={setPassword} secureTextEntry />
          </Field>
          <Pressable>
            <Text style={styles.forgot}>{t.login_forgot}</Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={t.login_signin}
            iconRight="chevron-right"
            block
            height={46}
            loading={loading}
            onPress={onSignIn}
            style={styles.signin}
          />

          <View style={styles.footer}>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.footerText}>
                {t.login_noaccount} <Text style={styles.footerLink}>{t.login_signup}</Text>
              </Text>
            </Pressable>
            <Pressable style={styles.langBtn} onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
              <Feather name="globe" size={14} color={c.text} />
              <Text style={styles.langLabel}>{lang === 'fr' ? 'EN' : 'FR'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    container: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 28 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
    brandIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brand: { fontFamily: fonts.heading, fontSize: 26, letterSpacing: -0.5, color: c.text },
    sub: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText, marginBottom: 40 },
    title: { fontFamily: fonts.heading, fontSize: 28, color: c.text, marginBottom: 24 },
    field: { marginBottom: 14 },
    fieldTight: { marginBottom: 10 },
    forgot: { fontFamily: fonts.heading, fontSize: 12, color: c.accent, alignSelf: 'flex-start' },
    error: { fontFamily: fonts.regular, fontSize: 13, color: c.danger, marginTop: 14 },
    signin: { marginTop: 22 },
    footer: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 24,
    },
    footerText: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText },
    footerLink: { fontFamily: fonts.heading, color: c.accent },
    langBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    langLabel: { fontFamily: fonts.heading, fontSize: 12, color: c.text },
  });
