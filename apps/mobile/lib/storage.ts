/**
 * Cache local, via AsyncStorage. Une clé par collection.
 *
 * Depuis que les données vivent sur le serveur, ce fichier ne détient plus
 * la vérité : il détient la dernière copie connue, pour que l'application
 * s'ouvre pleine plutôt que vide quand le réseau manque. Les modifications
 * en attente d'envoi, elles, sont dans `lib/outbox`.
 *
 * Rien de secret ne passe ici : les jetons sont dans le trousseau
 * (`lib/session`), jamais dans AsyncStorage — qui n'est qu'un fichier.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotification, Convert, Sector, Settings, UserDto } from '@moisson/core';

import type { Lang } from '@/constants/i18n';

export const KEYS = {
  introSeen: 'moisson:introSeen',
  user: 'moisson:user',
  photoUri: 'moisson:photoUri',
  converts: 'moisson:converts',
  sectors: 'moisson:sectors',
  plannedVisits: 'moisson:plannedVisits',
  notifications: 'moisson:notifications',
  lang: 'moisson:lang',
  settings: 'moisson:settings',
} as const;

/**
 * Visite planifiée en cours pour un dossier, indexée par dossier.
 *
 * L'interface ne montre qu'une échéance par converti, mais le serveur
 * connaît des visites à part entière. Cet index est le lien : il permet de
 * clore *la bonne* visite quand on coche la case.
 */
export type PlannedVisits = Record<string, { visitId: string; scheduledAt: string }>;

export type PersistedState = {
  introSeen: boolean;
  user: UserDto | null;
  photoUri: string | null;
  converts: Convert[];
  sectors: Sector[];
  plannedVisits: PlannedVisits;
  notifications: AppNotification[];
  lang: Lang;
  settings: Settings;
};

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // stockage indisponible — ignoré (mode dégradé en mémoire)
  }
}

const DEFAULT_SETTINGS: Settings = { notifOn: true, appLock: false, themePref: 'system' };

/** Charge le cache. Tout est vide au premier lancement. */
export async function loadAppState(): Promise<PersistedState> {
  const [
    introSeen,
    user,
    photoUri,
    converts,
    sectors,
    plannedVisits,
    notifications,
    lang,
    settings,
  ] = await Promise.all([
    getJSON<boolean>(KEYS.introSeen, false),
    getJSON<UserDto | null>(KEYS.user, null),
    getJSON<string | null>(KEYS.photoUri, null),
    getJSON<Convert[]>(KEYS.converts, []),
    getJSON<Sector[]>(KEYS.sectors, []),
    getJSON<PlannedVisits>(KEYS.plannedVisits, {}),
    getJSON<AppNotification[]>(KEYS.notifications, []),
    getJSON<Lang>(KEYS.lang, 'fr'),
    getJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS),
  ]);

  return {
    introSeen,
    user,
    photoUri,
    converts,
    sectors,
    plannedVisits,
    notifications,
    lang,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

/**
 * Efface les données d'un compte à la déconnexion.
 *
 * Un dossier de suivi porte le nom, le numéro et le positionnement religieux
 * d'une personne qui n'a jamais ouvert de compte. Il n'a rien à faire sur un
 * téléphone dont plus personne n'est connecté. Les préférences d'affichage
 * — langue, thème — survivent, elles ne désignent personne.
 */
export async function clearAccountCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEYS.user,
      KEYS.photoUri,
      KEYS.converts,
      KEYS.sectors,
      KEYS.plannedVisits,
      KEYS.notifications,
    ]);
  } catch {
    // ignoré : l'état en mémoire est de toute façon remis à zéro
  }
}
