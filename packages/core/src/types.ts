import type { StatusKey } from './status.js';

export type Sexe = 'H' | 'F';

export type HistoryEntry = { date: string; text: string };

export type Convert = {
  id: string;
  prenom: string;
  nom: string;
  tel: string;
  /** Peut rester inconnu : on préfère l'absence à une valeur inventée. */
  sexe: Sexe | null;
  secteur: string;
  statut: StatusKey;
  /** Date ISO (YYYY-MM-DD) de la prochaine visite, ou null si aucune. */
  nextVisit: string | null;
  done: boolean;
  /** Libellé d'affichage de la date d'ajout (ex. « 3 juil. »). */
  added: string;
  notes: string;
  history: HistoryEntry[];
  /** Identifiant de la notification locale planifiée (pour annulation). */
  reminderId?: string | null;
};

export type Sector = {
  id: string;
  name: string;
  ville: string;
  pays: string;
};

export type NotifIcon = 'bell' | 'alert' | 'check' | 'userplus';

export type AppNotification = {
  id: string;
  icon: NotifIcon;
  title: string;
  text: string;
  time: string;
  unread: boolean;
};

/**
 * L'utilisateur connecté, tel que l'interface l'affiche.
 *
 * Aucun mot de passe ni empreinte de mot de passe : l'authentification est
 * faite par le serveur, et le seul secret conservé sur l'appareil est le
 * couple de jetons, dans le trousseau du système.
 */
export type Evangelist = {
  id: string;
  name: string;
  email?: string;
  /** Non utilisé pour se connecter — le compte est identifié par l'adresse. */
  phone?: string;
  church: string;
  /** Photo choisie sur cet appareil. Locale : elle ne quitte pas le téléphone. */
  photoUri?: string | null;
};

export type ThemePref = 'system' | 'light' | 'dark';

export type Settings = {
  notifOn: boolean;
  appLock: boolean;
  themePref: ThemePref;
};
