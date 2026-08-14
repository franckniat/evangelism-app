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
import { useToast } from '@/context/ToastContext';
import { initials } from '@/lib/view';

export default function ProfileScreen() {
  const { t, currentUser, updateProfile } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState(currentUser?.name ?? '');
  const [church, setChurch] = useState(currentUser?.church ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(currentUser?.photoUri ?? null);

  const parts = name.split(' ');
  const ini = initials({ prenom: parts[0] ?? '', nom: parts[1] ?? '' });

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

  const onSave = () => {
    updateProfile({ name: name.trim(), church: church.trim(), photoUri });
    showToast(t.toast_profile);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StackHeader title={t.profile_title} onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.photoRow}>
            <Pressable style={styles.photo} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} contentFit="cover" />
              ) : (
                <Text style={styles.photoInitials}>{ini}</Text>
              )}
            </Pressable>
            <Pressable onPress={pickPhoto}>
              <Text style={styles.photoLabel}>{t.register_photo_change}</Text>
            </Pressable>
          </View>

          <Field label={t.register_name} style={styles.field}>
            <Input value={name} onChangeText={setName} />
          </Field>
          <Field label={t.register_church} style={styles.field}>
            <Input value={church} onChangeText={setChurch} />
          </Field>

          <View style={styles.idCard}>
            {!!currentUser?.email && (
              <View style={styles.idRow}>
                <Text style={styles.idLabel}>{t.profile_email}</Text>
                <Text style={styles.idValue}>{currentUser.email}</Text>
              </View>
            )}
            {!!currentUser?.phone && (
              <View style={styles.idRow}>
                <Text style={styles.idLabel}>{t.profile_phone}</Text>
                <Text style={styles.idValue}>{currentUser.phone}</Text>
              </View>
            )}
          </View>

          <Button title={t.profile_save} icon="check" block height={46} onPress={onSave} style={styles.save} />
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
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    photo: {
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoImg: { width: '100%', height: '100%' },
    photoInitials: { fontFamily: fonts.heading, fontSize: 24, color: c.onAccent },
    photoLabel: { fontFamily: fonts.heading, fontSize: 13, color: c.accent },
    field: { marginBottom: 14 },
    idCard: {
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.lg,
      backgroundColor: c.muted,
      overflow: 'hidden',
      marginBottom: 6,
    },
    idRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 13 },
    idLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText },
    idValue: { fontFamily: fonts.semibold, fontSize: 13, color: c.text },
    save: { marginTop: 14 },
  });
