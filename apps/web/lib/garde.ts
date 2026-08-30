import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SessionExpiree } from "@/lib/api";

/**
 * Exécute un chargement de données en rattrapant l'expiration du jeton.
 *
 * Un composant serveur ne peut pas écrire de cookies : la réponse a déjà
 * commencé à partir. Il ne peut donc pas renouveler la session lui-même. On
 * redirige vers le gestionnaire de route qui, lui, en a le droit — en lui
 * passant le chemin d'origine pour y revenir ensuite.
 *
 * Tout le reste des erreurs remonte : une panne de l'API doit se voir, pas
 * se déguiser en page vide.
 */
export async function charger<T>(chargement: () => Promise<T>): Promise<T> {
  try {
    return await chargement();
  } catch (erreur) {
    if (erreur instanceof SessionExpiree) {
      const chemin = (await headers()).get("x-chemin") ?? "/aujourdhui";
      redirect(`/session/rafraichir?suite=${encodeURIComponent(chemin)}`);
    }
    throw erreur;
  }
}
