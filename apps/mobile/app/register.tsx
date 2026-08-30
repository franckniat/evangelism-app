import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { StackHeader } from '@/components/ui/StackHeader';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';

export default function RegisterScreen() {
  const { t, register } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [church, setChurch] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const onSubmit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim() || !church.trim()) {
      setError(t.register_incomplete);
      return;
    }
    if (password.length < 8) {
      setError(t.register_weak_password);
      return;
    }

    setLoading(true);
    const res = await register({ name, church, password, photoUri, email });
    setLoading(false);

    if (!res.ok) {
      /**
       * Dire lequel des trois échecs s'est produit : « une erreur est
       * survenue » laisse l'utilisateur réessayer la même chose sans savoir
       * quoi changer.
       */
      setError(
        res.error === 'offline'
          ? t.login_offline
          : res.error === 'taken'
            ? t.register_error
            : t.register_incomplete
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StackHeader title={t.register_title} onBack={() => router.replace('/login')} backIcon="chevron-left" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.sub}>{t.register_sub}</Text>

          <View style={styles.photoRow}>
            <Pressable style={styles.photo} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} contentFit="cover" />
              ) : (
                <Feather name="camera" size={22} color={c.mutedText} />
              )}
            </Pressable>
            <Pressable onPress={pickPhoto}>
              <Text style={styles.photoLabel}>
                {photoUri ? t.register_photo_change : t.register_photo_add}
              </Text>
            </Pressable>
          </View>

          <Field label={t.register_name} style={styles.field}>
            <Input value={name} onChangeText={setName} placeholder="Jean Kamga" />
          </Field>

          <Field label={t.register_email} style={styles.field}>
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="jean@exemple.cm"
            />
          </Field>

          <Field label={t.login_pass} style={styles.field}>
            <Input value={password} onChangeText={setPassword} secureTextEntry />
          </Field>

          <Field label={t.register_church} style={styles.field}>
            <Input value={church} onChangeText={setChurch} placeholder="Église du Plein Évangile" />
          </Field>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={t.register_submit}
            icon="check"
            block
            height={46}
            loading={loading}
            onPress={onSubmit}
            style={styles.submit}
          />

          <Pressable style={styles.footer} onPress={() => router.replace('/login')}>
            <Text style={styles.footerText}>
              {t.register_haveaccount} <Text style={styles.footerLink}>{t.register_signin}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    container: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
    sub: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText, marginBottom: 20 },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    photo: {
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      backgroundColor: c.muted,
      borderWidth: 1,
      borderColor: c.divider,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoImg: { width: '100%', height: '100%' },
    photoLabel: { fontFamily: fonts.heading, fontSize: 13, color: c.accent },
    field: { marginBottom: 14 },
    error: { fontFamily: fonts.regular, fontSize: 13, color: c.danger, marginBottom: 4 },
    submit: { marginTop: 8 },
    footer: { marginTop: 20, alignItems: 'center' },
    footerText: { fontFamily: fonts.regular, fontSize: 12, color: c.mutedText },
    footerLink: { fontFamily: fonts.heading, color: c.accent },
  });
