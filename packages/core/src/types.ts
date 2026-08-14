import type { StatusKey } from './status';

export type Sexe = 'H' | 'F';

export type HistoryEntry = { date: string; text: string };

export type Convert = {
  id: string;
  prenom: string;
  nom: string;
  tel: string;
  sexe: Sexe;
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

export type Evangelist = {
  id: string;
  name: string;
  /** Identifiant email (optionnel : email OU téléphone). */
  email?: string;
  /** Identifiant téléphone (optionnel : email OU téléphone). */
  phone?: string;
  passwordHash: string;
  church: string;
  photoUri?: string | null;
};

export type ThemePref = 'system' | 'light' | 'dark';

export type Settings = {
  notifOn: boolean;
  appLock: boolean;
  themePref: ThemePref;
};
