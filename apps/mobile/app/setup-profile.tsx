import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';

/**
 * Création du profil local, au premier lancement.
 *
 * Pas de compte, pas de mot de passe : l'application est entièrement locale.
 * On demande seulement le nom et l'église, pour personnaliser l'affichage —
 * tout reste sur cet appareil. Une fois le profil créé, le routage enchaîne
 * sur la saisie des secteurs.
 */
export default function SetupProfileScreen() {
  const { t, createProfile } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [name, setName] = useState('');
  const [church, setChurch] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const onSubmit = () => {
    setError(null);
    if (!name.trim() || !church.trim()) {
      setError(t.register_incomplete);
      return;
    }
    // Le routage prend le relais : profil créé → saisie des secteurs.
    createProfile({ name, church, photoUri });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Feather name="plus" size={18} color={c.onAccent} />
            </View>
            <Text style={styles.brand}>HARVEST</Text>
          </View>

          <Text style={styles.title}>{t.setup_profile_title}</Text>
          <Text style={styles.sub}>{t.setup_profile_sub}</Text>

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

          <Field label={t.register_church} style={styles.field}>
            <Input value={church} onChangeText={setChurch} placeholder="Église du Plein Évangile" />
          </Field>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={t.setup_profile_submit}
            iconRight="chevron-right"
            block
            height={48}
            onPress={onSubmit}
            style={styles.submit}
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
    container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
    brandIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brand: { fontFamily: fonts.heading, fontSize: 18, letterSpacing: -0.3, color: c.text },
    title: { fontFamily: fonts.heading, fontSize: 24, color: c.text, marginBottom: 8 },
    sub: { fontFamily: fonts.regular, fontSize: 14, color: c.mutedText, lineHeight: 21, marginBottom: 24 },
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
  });
