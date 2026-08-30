/**
 * Reprise des données saisies avant que le serveur n'existe.
 *
 * Les versions locales de Harvest fabriquaient leurs identifiants avec
 * l'horloge (`k1738…`, `s1738…`). Le serveur, lui, n'accepte que des UUID.
 * Sans cette reprise, la première synchronisation remplacerait le contenu de
 * l'appareil par celui du compte — vide — et effacerait sans un mot le
 * travail déjà fait sur le terrain.
 *
 * Le procédé ne demande aucun code d'envoi particulier : on réattribue des
 * identifiants, on dépose des créations dans la file, et la file s'occupe du
 * reste. Elle sait déjà attendre le réseau et signaler un refus.
 */
import * as Crypto from 'expo-crypto';
import type { Convert, Sector } from '@harvest/core';

import { payloadFromConvert } from '@/lib/types';
import { enqueue } from '@/lib/outbox';
import type { PlannedVisits } from '@/lib/storage';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const estAncien = (id: string) => !UUID.test(id);

export type Reprise = {
  converts: Convert[];
  sectors: Sector[];
  plannedVisits: PlannedVisits;
  /** Nombre de dossiers repris — zéro signifie qu'il n'y avait rien à faire. */
  reprises: number;
};

export function aDesDonneesLocales(converts: Convert[], sectors: Sector[]): boolean {
  return converts.some((c) => estAncien(c.id)) || sectors.some((s) => estAncien(s.id));
}

/**
 * Réattribue des identifiants aux enregistrements locaux et les dépose dans
 * la file. Renvoie l'état corrigé, à substituer à celui du cache.
 */
export async function reprendreDonneesLocales(
  converts: Convert[],
  sectors: Sector[],
  plannedVisits: PlannedVisits
): Promise<Reprise> {
  const secteursRepris: Sector[] = [];
  const idParNom = new Map<string, string>();

  for (const s of sectors) {
    const id = estAncien(s.id) ? Crypto.randomUUID() : s.id;
    secteursRepris.push({ ...s, id });
    idParNom.set(s.name, id);

    if (estAncien(s.id)) {
      await enqueue({
        id: Crypto.randomUUID(),
        kind: 'sector.create',
        sectorId: id,
        body: {
          name: s.name,
          city: s.ville === '—' ? null : s.ville,
          country: s.pays === '—' ? null : s.pays,
        },
      });
    }
  }

  const dossiersRepris: Convert[] = [];
  const visitesReprises: PlannedVisits = { ...plannedVisits };
  let reprises = 0;

  for (const c of converts) {
    if (!estAncien(c.id)) {
      dossiersRepris.push(c);
      continue;
    }

    const id = Crypto.randomUUID();
    dossiersRepris.push({ ...c, id });
    delete visitesReprises[c.id];
    reprises += 1;

    /**
     * Le consentement n'est pas rejoué : ces fiches ont été saisies avant
     * que la question soit posée. Les marquer « consenties » serait
     * inventer un accord que personne n'a donné.
     */
    await enqueue({
      id: Crypto.randomUUID(),
      kind: 'convert.create',
      convertId: id,
      body: payloadFromConvert(c, idParNom),
    });

    // Une visite encore due est replanifiée ; une visite passée ne l'est pas.
    if (c.nextVisit && !c.done) {
      const visitId = Crypto.randomUUID();
      const scheduledAt = new Date(`${c.nextVisit}T10:00:00`).toISOString();
      visitesReprises[id] = { visitId, scheduledAt };

      await enqueue({
        id: Crypto.randomUUID(),
        kind: 'visit.create',
        visitId,
        convertId: id,
        scheduledAt,
      });
    }
  }

  return {
    converts: dossiersRepris,
    sectors: secteursRepris,
    plannedVisits: visitesReprises,
    reprises,
  };
}
