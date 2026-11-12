/**
 * Le format d'une sauvegarde, et sa validation.
 *
 * Tout vit sur le téléphone : sans sauvegarde, un appareil perdu emporte
 * tout le suivi. Ce fichier définit ce qu'un export contient et refuse,
 * à l'import, tout ce qui n'en a pas exactement la forme — mieux vaut un
 * refus net qu'une base à moitié remplacée par un fichier inattendu.
 *
 * Volontairement sans dépendance native : la lecture et l'écriture du
 * fichier sont dans `lib/backup-file`.
 *
 * Ce qui n'est pas exporté :
 * - les réglages de l'appareil — un verrou biométrique importé sur un
 *   téléphone sans empreinte enregistrée en interdirait l'accès ;
 * - la photo de profil — son chemin désigne un fichier de l'ancien
 *   téléphone ;
 * - les identifiants de rappels — les notifications planifiées ne
 *   voyagent pas, elles sont reprogrammées à l'import.
 */
import {
  STATUS_ORDER,
  type Convert,
  type Evangelist,
  type HistoryEntry,
  type Sector,
} from '@harvest/core';

export const FORMAT_SAUVEGARDE = 1;

export type Sauvegarde = {
  app: 'harvest';
  format: number;
  /** Instant ISO de l'export. */
  exportedAt: string;
  profil: Evangelist | null;
  secteurs: Sector[];
  convertis: Convert[];
};

export type Lecture =
  | { ok: true; sauvegarde: Sauvegarde }
  /**
   * `fichier` : illisible ou pas une sauvegarde Harvest ; `version` : vient
   * d'une version plus récente de l'application.
   */
  | { ok: false; raison: 'fichier' | 'version' };

export function construireSauvegarde(
  donnees: { profil: Evangelist | null; secteurs: Sector[]; convertis: Convert[] },
  instant: Date = new Date()
): Sauvegarde {
  return {
    app: 'harvest',
    format: FORMAT_SAUVEGARDE,
    exportedAt: instant.toISOString(),
    profil: donnees.profil ? { ...donnees.profil, photoUri: null } : null,
    secteurs: donnees.secteurs,
    convertis: donnees.convertis.map((c) => ({ ...c, reminderId: null })),
  };
}

const deux = (n: number) => String(n).padStart(2, '0');

/** `harvest-sauvegarde-2026-11-12-0815.json`, à l'heure locale. */
export function nomDeFichier(instant: Date): string {
  const jour = `${instant.getFullYear()}-${deux(instant.getMonth() + 1)}-${deux(instant.getDate())}`;
  return `harvest-sauvegarde-${jour}-${deux(instant.getHours())}${deux(instant.getMinutes())}.json`;
}

/* ------------------------------------------------------------------ *
 * Validation
 *
 * Chaque enregistrement est reconstruit champ par champ : ce qui n'est pas
 * prévu par le format est ignoré, ce qui manque ou a le mauvais type fait
 * échouer tout l'import.
 * ------------------------------------------------------------------ */

class FormatInvalide extends Error {}

type Brut = Record<string, unknown>;

function objet(v: unknown): Brut {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new FormatInvalide();
  return v as Brut;
}

function texte(v: unknown): string {
  if (typeof v !== 'string') throw new FormatInvalide();
  return v;
}

function texteOuNull(v: unknown): string | null {
  return v === null || v === undefined ? null : texte(v);
}

function texteFacultatif(v: unknown): string | undefined {
  return v === undefined ? undefined : texte(v);
}

function tableau(v: unknown): unknown[] {
  if (!Array.isArray(v)) throw new FormatInvalide();
  return v;
}

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

function lireHistorique(v: unknown): HistoryEntry {
  const h = objet(v);
  return { date: texte(h.date), text: texte(h.text) };
}

function lireConverti(v: unknown): Convert {
  const c = objet(v);
  const statut = texte(c.statut);
  if (!(STATUS_ORDER as string[]).includes(statut)) throw new FormatInvalide();
  if (c.sexe !== null && c.sexe !== 'H' && c.sexe !== 'F') throw new FormatInvalide();
  const nextVisit = texteOuNull(c.nextVisit);
  if (nextVisit !== null && !DATE_ISO.test(nextVisit)) throw new FormatInvalide();
  if (typeof c.done !== 'boolean') throw new FormatInvalide();

  return {
    id: texte(c.id),
    prenom: texte(c.prenom),
    nom: texte(c.nom),
    tel: texte(c.tel),
    sexe: c.sexe,
    secteur: texte(c.secteur),
    statut: statut as Convert['statut'],
    nextVisit,
    done: c.done,
    added: texte(c.added),
    notes: texte(c.notes),
    history: tableau(c.history).map(lireHistorique),
    reminderId: null,
    // Absent des fiches créées avant ce champ : « inconnu », pas « refusé ».
    ...(c.consentedAt !== undefined ? { consentedAt: texteOuNull(c.consentedAt) } : {}),
    ...(c.updatedAt !== undefined ? { updatedAt: texte(c.updatedAt) } : {}),
  };
}

function lireSecteur(v: unknown): Sector {
  const s = objet(v);
  return {
    id: texte(s.id),
    name: texte(s.name),
    ville: texte(s.ville),
    pays: texte(s.pays),
    ...(s.updatedAt !== undefined ? { updatedAt: texte(s.updatedAt) } : {}),
  };
}

function lireProfil(v: unknown): Evangelist | null {
  if (v === null) return null;
  const p = objet(v);
  return {
    id: texte(p.id),
    name: texte(p.name),
    church: texte(p.church),
    photoUri: null,
    ...(p.email !== undefined ? { email: texteFacultatif(p.email) } : {}),
    ...(p.phone !== undefined ? { phone: texteFacultatif(p.phone) } : {}),
    ...(p.updatedAt !== undefined ? { updatedAt: texte(p.updatedAt) } : {}),
  };
}

function sansDoublon(ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new FormatInvalide();
}

export function lireSauvegarde(contenu: string): Lecture {
  let racine: Brut;
  try {
    racine = objet(JSON.parse(contenu));
  } catch {
    return { ok: false, raison: 'fichier' };
  }

  if (racine.app !== 'harvest' || typeof racine.format !== 'number') {
    return { ok: false, raison: 'fichier' };
  }
  if (racine.format > FORMAT_SAUVEGARDE) return { ok: false, raison: 'version' };

  try {
    const exportedAt = texte(racine.exportedAt);
    if (Number.isNaN(Date.parse(exportedAt))) throw new FormatInvalide();

    const secteurs = tableau(racine.secteurs).map(lireSecteur);
    const convertis = tableau(racine.convertis).map(lireConverti);
    sansDoublon(secteurs.map((s) => s.id));
    sansDoublon(convertis.map((c) => c.id));

    return {
      ok: true,
      sauvegarde: {
        app: 'harvest',
        format: racine.format,
        exportedAt,
        profil: lireProfil(racine.profil),
        secteurs,
        convertis,
      },
    };
  } catch {
    return { ok: false, raison: 'fichier' };
  }
}
