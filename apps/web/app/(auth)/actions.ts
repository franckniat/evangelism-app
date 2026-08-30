"use server";

import { redirect } from "next/navigation";

import { ApiError, auth } from "@/lib/api";
import { effacerJetons, ecrireJetons, lireJetons } from "@/lib/session";

export type EtatFormulaire = { erreur: string | null };

/** Un chemin interne, jamais une adresse extérieure fournie dans l'URL. */
function destinationSure(valeur: FormDataEntryValue | null): string {
  const suite = typeof valeur === "string" ? valeur : "";
  return suite.startsWith("/") && !suite.startsWith("//") ? suite : "/aujourdhui";
}

export async function connexion(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const email = String(donnees.get("email") ?? "")
    .trim()
    .toLowerCase();
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  const suite = destinationSure(donnees.get("suite"));

  if (!email || !motDePasse) {
    return { erreur: "Renseignez votre adresse et votre mot de passe." };
  }

  try {
    const session = await auth.connexion(email, motDePasse);
    await ecrireJetons({
      acces: session.accessToken.value,
      rafraichissement: session.refreshToken.value,
    });
  } catch (erreur) {
    if (erreur instanceof ApiError && erreur.status === 429) {
      return {
        erreur:
          "Trop de tentatives sur ce compte. Réessayez dans une quinzaine de minutes.",
      };
    }

    /**
     * Un seul message pour « adresse inconnue » et « mot de passe faux ».
     * Les distinguer dirait à un inconnu quelles adresses ont un compte
     * chez nous, ce qui est déjà une information sur des personnes.
     */
    if (erreur instanceof ApiError) {
      return { erreur: "Adresse ou mot de passe incorrect." };
    }

    return { erreur: "Serveur injoignable. Réessayez dans un instant." };
  }

  // Hors du `try` : `redirect` fonctionne en levant une exception.
  redirect(suite);
}

export async function inscription(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const nom = String(donnees.get("nom") ?? "").trim();
  const email = String(donnees.get("email") ?? "")
    .trim()
    .toLowerCase();
  const motDePasse = String(donnees.get("motDePasse") ?? "");
  const eglise = String(donnees.get("eglise") ?? "").trim();

  if (!nom || !email || !motDePasse) {
    return { erreur: "Nom, adresse et mot de passe sont nécessaires." };
  }

  if (motDePasse.length < 8) {
    return { erreur: "Le mot de passe doit faire au moins 8 caractères." };
  }

  try {
    const session = await auth.inscription({
      fullName: nom,
      email,
      password: motDePasse,
      church: eglise || null,
    });
    await ecrireJetons({
      acces: session.accessToken.value,
      rafraichissement: session.refreshToken.value,
    });
  } catch (erreur) {
    if (erreur instanceof ApiError) {
      const messages = erreur.messages;
      return {
        erreur: messages.length
          ? messages.join(" ")
          : "Inscription refusée. Vérifiez votre saisie.",
      };
    }
    return { erreur: "Serveur injoignable. Réessayez dans un instant." };
  }

  redirect("/aujourdhui");
}

export async function deconnexion(): Promise<void> {
  const jetons = await lireJetons();

  if (jetons) {
    try {
      await auth.deconnexion(jetons.acces, jetons.rafraichissement);
    } catch {
      /**
       * Se déconnecter doit aboutir même si le serveur ne répond pas : les
       * cookies partent dans tous les cas, et la session résiduelle côté
       * serveur finira par expirer.
       */
    }
  }

  await effacerJetons();
  redirect("/connexion");
}
