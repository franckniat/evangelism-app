/**
 * Persistance locale via AsyncStorage. Une clé par collection.
 * L'application démarre VIDE : aucune donnée de démonstration n'est amorcée.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '@/constants/i18n';
import type { AppNotification, Convert, Evangelist, Sector, Settings } from '@/lib/types';

export const KEYS = {
  introSeen: 'moisson:introSeen',
  evangelists: 'moisson:evangelists',
  currentUserId: 'moisson:currentUserId',
  converts: 'moisson:converts',
  sectors: 'moisson:sectors',
  notifications: 'moisson:notifications',
  lang: 'moisson:lang',
  settings: 'moisson:settings',
} as const;

export type PersistedState = {
  introSeen: boolean;
  evangelists: Evangelist[];
  currentUserId: string | null;
  converts: Convert[];
  sectors: Sector[];
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

/** Charge l'état persistant. Tout est vide au premier lancement. */
export async function loadAppState(): Promise<PersistedState> {
  const [introSeen, evangelists, currentUserId, converts, sectors, notifications, lang, settings] =
    await Promise.all([
      getJSON<boolean>(KEYS.introSeen, false),
      getJSON<Evangelist[]>(KEYS.evangelists, []),
      getJSON<string | null>(KEYS.currentUserId, null),
      getJSON<Convert[]>(KEYS.converts, []),
      getJSON<Sector[]>(KEYS.sectors, []),
      getJSON<AppNotification[]>(KEYS.notifications, []),
      getJSON<Lang>(KEYS.lang, 'fr'),
      getJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS),
    ]);

  return {
    introSeen,
    evangelists,
    currentUserId,
    converts,
    sectors,
    notifications,
    lang,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}
