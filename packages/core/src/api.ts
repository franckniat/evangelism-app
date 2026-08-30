/**
 * Ce que l'API renvoie, et comment cela devient le modèle d'affichage.
 *
 * Deux vocabulaires cohabitent dans ce projet et c'est délibéré : le serveur
 * parle anglais (`firstName`, `sectorId`, `nextVisitAt`), l'interface parle
 * français (`prenom`, `secteur`, `nextVisit`). Plutôt que de renommer l'un
 * des deux — ce qui toucherait soit les migrations, soit les quatorze écrans
 * déjà écrits — la traduction est faite ici, à un seul endroit.
 *
 * Ce fichier vit dans `@moisson/core` parce que le mobile et le web
 * consomment la même API : la conversion ne doit exister qu'une fois.
 */
import type { StatusKey } from './status.js';
import type { Convert, HistoryEntry, Sector, Sexe } from './types.js';
import type { Dict, Lang } from './i18n.js';

/* ------------------------------------------------------------------ *
 * Formes reçues du serveur
 * ------------------------------------------------------------------ */

export type ConvertDto = {
  id: string;
  firstName: string;
  lastName: string | null;
  shortName: string;
  phone: string | null;
  email: string | null;
  sex: Sexe | null;
  status: StatusKey;
  sectorId: string | null;
  notes: string | null;
  hasConsented: boolean;
  metAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Plus proche visite encore planifiée, calculée serveur. */
  nextVisitAt: string | null;
};

export type SectorDto = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  convertsCount: number;
  createdAt: string | null;
};

export type VisitStatus = 'planned' | 'done' | 'postponed' | 'missed' | 'cancelled';

export type VisitDto = {
  id: string;
  convertId: string;
  scheduledAt: string | null;
  status: VisitStatus;
  report: string | null;
  isOverdue: boolean;
  completedAt: string | null;
  createdAt: string | null;
  convert: { id: string; shortName: string; phone: string | null } | null;
};

export type EventType = 'created' | 'status_changed' | 'note' | 'call' | 'visit_planned' | 'visit_done';

export type EventDto = {
  id: string;
  type: EventType;
  text: string | null;
  createdAt: string | null;
};

export type UserDto = {
  id: number;
  fullName: string | null;
  church: string | null;
  email: string;
  initials: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TokenDto = { type: string; value: string; expiresAt: string | null };

export type AuthDto = {
  user: UserDto;
  accessToken: TokenDto;
  refreshToken: { value: string; expiresAt: string | null };
};

/* ------------------------------------------------------------------ *
 * Serveur → interface
 * ------------------------------------------------------------------ */

/** Extrait la partie date (YYYY-MM-DD) d'un instant ISO, en heure locale. */
export function localDateOf(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** « 3 juil. » — le libellé court affiché sous un nom. */
export function shortDate(iso: string | null, lang: Lang): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Un dossier serveur devient un converti affichable.
 *
 * `secteur` est un nom et non un identifiant côté interface : les écrans
 * filtrent et affichent des noms. L'appelant fournit donc la table de
 * correspondance ; un secteur inconnu donne une chaîne vide, jamais un
 * identifiant brut lâché dans l'affichage.
 *
 * `done` se déduit de l'absence de visite planifiée plutôt que d'être
 * stocké : une visite effectuée ferme la tâche, et une valeur dupliquée
 * finirait par diverger de sa source.
 */
export function convertFromDto(
  dto: ConvertDto,
  sectorNames: Map<string, string>,
  lang: Lang,
  previous?: Convert
): Convert {
  return {
    id: dto.id,
    prenom: dto.firstName,
    nom: dto.lastName ?? '',
    tel: dto.phone ?? '',
    sexe: dto.sex,
    secteur: dto.sectorId ? (sectorNames.get(dto.sectorId) ?? '') : '',
    statut: dto.status,
    nextVisit: localDateOf(dto.nextVisitAt),
    done: dto.nextVisitAt == null,
    added: shortDate(dto.createdAt, lang),
    notes: dto.notes ?? '—',

    /**
     * Le fil n'est renvoyé que par la fiche détaillée. Sur la liste on
     * conserve donc ce qu'on avait déjà, plutôt que de l'effacer à chaque
     * rafraîchissement.
     */
    history: previous?.history ?? [],

    /**
     * Purement local : l'identifiant d'une notification planifiée sur cet
     * appareil-ci. Il n'a aucun sens sur un autre téléphone, donc il ne
     * traverse jamais le réseau.
     */
    reminderId: previous?.reminderId ?? null,
  };
}

export function sectorFromDto(dto: SectorDto): Sector {
  return {
    id: dto.id,
    name: dto.name,
    ville: dto.city ?? '—',
    pays: dto.country ?? '—',
  };
}

/** Le fil d'activité du serveur, mis en forme pour l'écran de détail. */
export function historyFromEvents(events: EventDto[], t: Dict, lang: Lang): HistoryEntry[] {
  return events.map((e) => ({
    date: shortDate(e.createdAt, lang),
    text: eventLabel(e, t),
  }));
}

function eventLabel(e: EventDto, t: Dict): string {
  switch (e.type) {
    case 'created':
      return t.hist_first;
    case 'visit_planned':
      return t.hist_planned;
    case 'visit_done':
      return e.text ? `${t.hist_visit_done} — ${e.text}` : t.hist_visit_done;
    case 'status_changed':
      return `${t.hist_status} : ${e.text ?? ''}`.trim();
    case 'call':
      return e.text ? `${t.hist_call} — ${e.text}` : t.hist_call;
    case 'note':
      return e.text ?? t.hist_note;
    default:
      return e.text ?? '';
  }
}

/* ------------------------------------------------------------------ *
 * Interface → serveur
 * ------------------------------------------------------------------ */

export type ConvertPayload = {
  firstName: string;
  lastName: string | null;
  phone: string | null;
  sex: Sexe | null;
  status: StatusKey;
  sectorId: string | null;
  notes: string | null;
};

/**
 * Le chemin inverse : ce que l'interface a saisi devient ce que le serveur
 * attend. Les chaînes vides deviennent `null` — une colonne vide et une
 * colonne contenant `''` doivent se ressembler en base, sinon les filtres
 * mentent.
 */
export function payloadFromConvert(
  c: Pick<Convert, 'prenom' | 'nom' | 'tel' | 'sexe' | 'secteur' | 'statut' | 'notes'>,
  sectorIds: Map<string, string>
): ConvertPayload {
  const notes = c.notes.trim();
  return {
    firstName: c.prenom.trim(),
    lastName: c.nom.trim() || null,
    phone: c.tel.trim() || null,
    sex: c.sexe,
    status: c.statut,
    sectorId: c.secteur ? (sectorIds.get(c.secteur) ?? null) : null,
    notes: notes && notes !== '—' ? notes : null,
  };
}
