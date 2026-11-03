/**
 * Le dépôt local — la source de vérité de l'application.
 *
 * Tout vit ici, sur l'appareil, dans AsyncStorage. L'application ne dépend
 * d'aucun serveur : ce fichier détient les données, il n'en cache pas une
 * copie. C'est le **point de passage unique** du local-first — et donc le
 * seul endroit où une future synchronisation viendra se greffer, sans que
 * le reste de l'application ait à changer.
 *
 * Rien de tout cela n'est chiffré : la protection vient du verrou de
 * l'appareil et du verrou biométrique de l'application (`LockGate`). La
 * sauvegarde, elle, passe par un export/import de fichier (voir les
 * réglages), pas par un serveur.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotification, Convert, Evangelist, Sector, Settings } from '@harvest/core';

import type { Lang } from '@/constants/i18n';

/**
 * Une clé par collection. On conserve le préfixe `harvest:` des versions
 * précédentes ; `profil` remplace l'ancien `user` (qui portait un profil
 * serveur), et il n'y a plus ni `plannedVisits` ni `photoUri` séparés : la
 * prochaine visite vit sur le converti, et la photo sur le profil.
 */
export const KEYS = {
  introSeen: 'harvest:introSeen',
  profil: 'harvest:profil',
  convertis: 'harvest:converts',
  secteurs: 'harvest:sectors',
  notifications: 'harvest:notifications',
  lang: 'harvest:lang',
  settings: 'harvest:settings',
} as const;

/**
 * L'état complet détenu localement. C'est aussi, tel quel, la forme
 * sérialisée d'une sauvegarde (export/import).
 */
export type LocalState = {
  introSeen: boolean;
  profil: Evangelist | null;
  convertis: Convert[];
  secteurs: Sector[];
  notifications: AppNotification[];
  lang: Lang;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  notifOn: true,
  appLock: false,
  themePref: 'system',
};

/**
 * Horodatage ISO de « maintenant ».
 *
 * Posé sur chaque enregistrement créé ou modifié (`updatedAt`). Inutile tant
 * que tout est local, mais c'est ce qui permettra, le jour venu, à une
 * synchronisation de savoir quel côté a la version la plus récente — sans
 * avoir à migrer les données déjà saisies.
 */
export function maintenant(): string {
  return new Date().toISOString();
}

async function lire<T>(key: string, defaut: T): Promise<T> {
  try {
    const brut = await AsyncStorage.getItem(key);
    return brut == null ? defaut : (JSON.parse(brut) as T);
  } catch {
    return defaut;
  }
}

async function ecrire(key: string, valeur: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(valeur));
  } catch {
    // Stockage indisponible : on reste en mémoire pour cette exécution.
    // Mieux vaut une perte au prochain lancement qu'un écran d'erreur ici.
  }
}

/** Charge tout l'état local. Tout est vide au premier lancement. */
export async function chargerEtat(): Promise<LocalState> {
  const [introSeen, profil, convertis, secteurs, notifications, lang, settings] =
    await Promise.all([
      lire<boolean>(KEYS.introSeen, false),
      lire<Evangelist | null>(KEYS.profil, null),
      lire<Convert[]>(KEYS.convertis, []),
      lire<Sector[]>(KEYS.secteurs, []),
      lire<AppNotification[]>(KEYS.notifications, []),
      lire<Lang>(KEYS.lang, 'fr'),
      lire<Settings>(KEYS.settings, DEFAULT_SETTINGS),
    ]);

  return {
    introSeen,
    profil,
    convertis,
    secteurs,
    notifications,
    lang,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

/* ------------------------------------------------------------------ *
 * Persistance par collection
 *
 * Granulaire à dessein : l'application persiste la collection qui vient de
 * changer, pas tout l'état à chaque fois.
 * ------------------------------------------------------------------ */

export const persisterIntroSeen = (v: boolean) => ecrire(KEYS.introSeen, v);
export const persisterProfil = (v: Evangelist | null) => ecrire(KEYS.profil, v);
export const persisterConvertis = (v: Convert[]) => ecrire(KEYS.convertis, v);
export const persisterSecteurs = (v: Sector[]) => ecrire(KEYS.secteurs, v);
export const persisterNotifications = (v: AppNotification[]) =>
  ecrire(KEYS.notifications, v);
export const persisterLang = (v: Lang) => ecrire(KEYS.lang, v);
export const persisterSettings = (v: Settings) => ecrire(KEYS.settings, v);

/**
 * Remplace tout l'état d'un coup — utilisé par l'import d'une sauvegarde et
 * par une éventuelle réinitialisation. Les préférences d'affichage (langue,
 * thème) ne désignent personne et peuvent être laissées de côté par
 * l'appelant si besoin.
 */
export async function remplacerTout(etat: LocalState): Promise<void> {
  await Promise.all([
    persisterIntroSeen(etat.introSeen),
    persisterProfil(etat.profil),
    persisterConvertis(etat.convertis),
    persisterSecteurs(etat.secteurs),
    persisterNotifications(etat.notifications),
    persisterLang(etat.lang),
    persisterSettings(etat.settings),
  ]);
}

/** Efface toutes les données locales (réinitialisation complète). */
export async function effacerTout(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch {
    // ignoré : l'état en mémoire est de toute façon remis à zéro
  }
}
