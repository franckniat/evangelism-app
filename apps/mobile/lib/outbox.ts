/**
 * La file d'écriture.
 *
 * Un évangéliste saisit un contact debout dans une cour, souvent sans réseau.
 * L'application ne peut donc pas attendre le serveur pour accepter une
 * saisie : chaque modification est appliquée localement tout de suite, puis
 * déposée ici. La file est vidée dans l'ordre dès qu'une requête passe.
 *
 * Ce qui rend la chose sûre, c'est que les identifiants sont créés par le
 * téléphone (UUID v4) et acceptés tels quels par le serveur. Un dossier créé
 * hors ligne porte donc immédiatement son identifiant définitif : il n'y a
 * jamais d'identifiant provisoire à réconcilier, et les modifications
 * suivantes peuvent le désigner avant même qu'il existe côté serveur.
 *
 * Trois issues possibles pour une entrée, et une seule est un échec :
 *   • elle passe          → retirée de la file ;
 *   • le réseau manque    → conservée, on s'arrête là et on reprendra ;
 *   • le serveur refuse   → retirée, et signalée. La garder reviendrait à
 *     bloquer éternellement la file derrière une requête qui sera toujours
 *     refusée.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, OfflineError, api, hasSession } from '@/lib/api';

const KEY = 'harvest:outbox';

export type Mutation =
  | { id: string; kind: 'convert.create'; convertId: string; body: Record<string, unknown> }
  | { id: string; kind: 'convert.update'; convertId: string; body: Record<string, unknown> }
  | { id: string; kind: 'convert.delete'; convertId: string }
  | { id: string; kind: 'sector.create'; sectorId: string; body: Record<string, unknown> }
  | { id: string; kind: 'sector.update'; sectorId: string; body: Record<string, unknown> }
  | { id: string; kind: 'sector.delete'; sectorId: string }
  | { id: string; kind: 'visit.create'; visitId: string; convertId: string; scheduledAt: string }
  | { id: string; kind: 'visit.complete'; visitId: string }
  | { id: string; kind: 'visit.postpone'; visitId: string }
  | { id: string; kind: 'note.add'; convertId: string; text: string }
  | { id: string; kind: 'profile.update'; body: Record<string, unknown> };

export type DrainResult = {
  /** Entrées restant à envoyer. */
  pending: number;
  /** Vrai si l'on s'est arrêté faute de réseau. */
  offline: boolean;
  /** Entrées abandonnées parce que le serveur les a refusées. */
  rejected: Mutation[];
};

let queue: Mutation[] = [];
let loaded = false;

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // stockage indisponible : la file reste en mémoire pour cette exécution
  }
}

export async function loadOutbox(): Promise<number> {
  if (loaded) return queue.length;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    queue = raw ? (JSON.parse(raw) as Mutation[]) : [];
  } catch {
    queue = [];
  }
  loaded = true;
  return queue.length;
}

export function pendingCount(): number {
  return queue.length;
}

/**
 * Les enregistrements que le serveur ne connaît pas encore.
 *
 * Un rafraîchissement remplace l'état local par celui du serveur. Sans cette
 * liste, une saisie faite pendant qu'une lecture était en vol disparaîtrait
 * de l'écran — elle est bien dans la file, mais l'utilisateur, lui, voit son
 * travail s'effacer et le refait.
 */
export function idsEnAttente(): { convertis: Set<string>; secteurs: Set<string> } {
  const convertis = new Set<string>();
  const secteurs = new Set<string>();

  for (const m of queue) {
    if ('convertId' in m) convertis.add(m.convertId);
    if ('sectorId' in m) secteurs.add(m.sectorId);
  }

  return { convertis, secteurs };
}

export async function clearOutbox(): Promise<void> {
  queue = [];
  loaded = true;
  await persist();
}

/**
 * Dépose une modification.
 *
 * Deux modifications successives du même dossier fusionnent : corriger un
 * numéro trois fois de suite ne doit pas produire trois requêtes. La fusion
 * ne se fait qu'avec l'entrée en queue de file, jamais au travers d'une
 * autre opération — l'ordre est ce qui garantit la cohérence.
 */
export async function enqueue(mutation: Mutation): Promise<void> {
  const last = queue[queue.length - 1];

  if (
    last &&
    last.kind === 'convert.update' &&
    mutation.kind === 'convert.update' &&
    last.convertId === mutation.convertId
  ) {
    last.body = { ...last.body, ...mutation.body };
  } else {
    queue.push(mutation);
  }

  await persist();
}

/**
 * Retire tout ce qui concerne un dossier créé puis supprimé sans jamais
 * avoir atteint le serveur. Inutile de créer une fiche pour l'effacer dans
 * la foulée — et le serveur refuserait la suppression d'un inconnu.
 */
export async function forgetLocalConvert(convertId: string): Promise<boolean> {
  const jamaisEnvoye = queue.some(
    (m) => m.kind === 'convert.create' && m.convertId === convertId
  );
  if (!jamaisEnvoye) return false;

  queue = queue.filter((m) => {
    if ('convertId' in m && m.convertId === convertId) return false;
    return true;
  });
  await persist();
  return true;
}

export async function forgetLocalSector(sectorId: string): Promise<boolean> {
  const jamaisEnvoye = queue.some((m) => m.kind === 'sector.create' && m.sectorId === sectorId);
  if (!jamaisEnvoye) return false;

  queue = queue.filter((m) => !('sectorId' in m && m.sectorId === sectorId));
  await persist();
  return true;
}

async function apply(m: Mutation): Promise<void> {
  switch (m.kind) {
    case 'convert.create':
      await api.createConvert({ id: m.convertId, ...m.body });
      return;
    case 'convert.update':
      await api.updateConvert(m.convertId, m.body);
      return;
    case 'convert.delete':
      await api.deleteConvert(m.convertId);
      return;
    case 'sector.create':
      await api.createSector({ id: m.sectorId, ...m.body });
      return;
    case 'sector.update':
      await api.updateSector(m.sectorId, m.body);
      return;
    case 'sector.delete':
      await api.deleteSector(m.sectorId);
      return;
    case 'visit.create':
      await api.createVisit({ id: m.visitId, convertId: m.convertId, scheduledAt: m.scheduledAt });
      return;
    case 'visit.complete':
      await api.updateVisit(m.visitId, { status: 'done' });
      return;
    /**
     * Replanifier ne supprime pas la visite précédente : elle est reportée.
     * Effacer la trace d'un rendez-vous qu'on n'a pas honoré arrangerait
     * les statistiques, pas le suivi.
     */
    case 'visit.postpone':
      await api.updateVisit(m.visitId, { status: 'postponed' });
      return;
    case 'note.add':
      await api.addNote(m.convertId, m.text);
      return;
    case 'profile.update':
      await api.updateProfile(m.body);
      return;
  }
}

let draining: Promise<DrainResult> | null = null;

/** Vide la file, dans l'ordre, jusqu'au premier obstacle réseau. */
export function drain(): Promise<DrainResult> {
  if (draining) return draining;

  draining = (async (): Promise<DrainResult> => {
    const rejected: Mutation[] = [];

    try {
      while (queue.length > 0 && hasSession()) {
        const current = queue[0];

        try {
          await apply(current);
        } catch (error) {
          if (error instanceof OfflineError) {
            return { pending: queue.length, offline: true, rejected };
          }

          if (error instanceof ApiError && error.isDefinitive) {
            /**
             * 404 sur une suppression, 422 sur une saisie que le serveur
             * juge invalide : dans les deux cas, réessayer donnerait
             * exactement la même réponse. On abandonne l'entrée et on
             * remonte le fait plutôt que de bloquer la file.
             */
            rejected.push(current);
          } else {
            // 5xx, 429, ou session perdue : on garde la place et on réessaiera.
            return { pending: queue.length, offline: false, rejected };
          }
        }

        queue.shift();
        await persist();
      }

      return { pending: queue.length, offline: false, rejected };
    } finally {
      draining = null;
    }
  })();

  return draining;
}
