import { cookies } from "next/headers";

/**
 * La session web, en cookies `httpOnly`.
 *
 * Le navigateur ne voit jamais les jetons et ne parle jamais à l'API : tout
 * passe par le serveur Next. C'est le point important. Un jeton rangé dans
 * `localStorage` est lisible par n'importe quel script chargé sur la page —
 * une dépendance compromise suffirait alors à exfiltrer l'accès au fichier
 * de suivi. `httpOnly` ferme cette porte.
 *
 * `sameSite: lax` ferme la seconde : un formulaire hébergé ailleurs ne peut
 * pas faire écrire l'API en se servant de la session de la personne.
 */
const ACCES = "harvest_acces";
const RAFRAICHISSEMENT = "harvest_rafraichissement";

/** Trente jours : la durée de vie d'une famille de jetons côté serveur. */
const DUREE_RAFRAICHISSEMENT = 30 * 24 * 60 * 60;

const options = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
} as const;

export type Jetons = { acces: string; rafraichissement: string };

export async function lireJetons(): Promise<Jetons | null> {
  const boite = await cookies();
  const acces = boite.get(ACCES)?.value;
  const rafraichissement = boite.get(RAFRAICHISSEMENT)?.value;

  if (!acces || !rafraichissement) return null;
  return { acces, rafraichissement };
}

/** Uniquement depuis une action serveur ou un gestionnaire de route. */
export async function ecrireJetons(jetons: Jetons): Promise<void> {
  const boite = await cookies();

  /**
   * Le jeton d'accès expire en trente minutes côté serveur, mais son cookie
   * vit aussi longtemps que la session : c'est l'API qui décide de sa
   * validité, pas le navigateur. Un cookie qui disparaîtrait plus tôt
   * priverait le rafraîchissement de la moitié de son couple.
   */
  boite.set(ACCES, jetons.acces, { ...options, maxAge: DUREE_RAFRAICHISSEMENT });
  boite.set(RAFRAICHISSEMENT, jetons.rafraichissement, {
    ...options,
    maxAge: DUREE_RAFRAICHISSEMENT,
  });
}

export async function effacerJetons(): Promise<void> {
  const boite = await cookies();
  boite.delete(ACCES);
  boite.delete(RAFRAICHISSEMENT);
}

export const NOMS_COOKIES = { ACCES, RAFRAICHISSEMENT } as const;
