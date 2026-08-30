/**
 * Où vivent les jetons.
 *
 * Sur un téléphone : dans le trousseau (Keychain iOS / Keystore Android) via
 * expo-secure-store, chiffré par le système et hors de portée d'une
 * sauvegarde en clair. Un jeton de rafraîchissement vaut la session entière —
 * il n'a rien à faire dans AsyncStorage, qui est un simple fichier.
 *
 * Sur le web, SecureStore n'existe pas : on retombe sur AsyncStorage, donc
 * sur `localStorage`. C'est moins bon et c'est assumé — Expo Web n'est ici
 * qu'un mode de développement, le vrai client web est l'application Next.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'harvest.session';

export type StoredSession = {
  accessToken: string;
  /** Instant ISO d'expiration de l'accès, ou null si le serveur n'en donne pas. */
  accessExpiresAt: string | null;
  refreshToken: string;
};

const secureAvailable = Platform.OS !== 'web';

async function readRaw(): Promise<string | null> {
  try {
    return secureAvailable
      ? await SecureStore.getItemAsync(KEY)
      : await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  if (secureAvailable) await SecureStore.setItemAsync(KEY, value);
  else await AsyncStorage.setItem(KEY, value);
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed.accessToken && parsed.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await writeRaw(JSON.stringify(session));
  } catch {
    // Trousseau indisponible : la session reste en mémoire pour cette
    // exécution. Mieux vaut une reconnexion au prochain lancement qu'un
    // écran d'erreur ici.
  }
}

export async function clearSession(): Promise<void> {
  try {
    if (secureAvailable) await SecureStore.deleteItemAsync(KEY);
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // rien à faire : la session est de toute façon abandonnée en mémoire
  }
}
