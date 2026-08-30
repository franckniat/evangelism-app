"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError, SessionExpiree, api } from "@/lib/api";

export type Retour = { erreur: string | null };

const OK: Retour = { erreur: null };

/**
 * Traduit un échec d'API en phrase affichable.
 *
 * `SessionExpiree` est laissée passer : elle n'est pas une erreur de saisie
 * mais un besoin de renouvellement, traité par la redirection habituelle.
 */
function echec(erreur: unknown): Retour {
  if (erreur instanceof SessionExpiree) throw erreur;

  if (erreur instanceof ApiError) {
    if (erreur.status === 404) {
      return { erreur: "Cet élément n'existe plus." };
    }
    const messages = erreur.messages;
    return {
      erreur: messages.length ? messages.join(" ") : "Le serveur a refusé la demande.",
    };
  }

  return { erreur: "Serveur injoignable. Réessayez dans un instant." };
}

const texte = (donnees: FormData, champ: string) =>
  String(donnees.get(champ) ?? "").trim();

/** Le délai par défaut avant la prochaine visite, en jours. */
const DELAI_VISITE = 3;

function dansJours(jours: number): string {
  const date = new Date();
  date.setDate(date.getDate() + jours);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

/* ------------------------------------------------------------------ *
 * Convertis
 * ------------------------------------------------------------------ */

export async function creerConverti(
  _precedent: Retour,
  donnees: FormData,
): Promise<Retour> {
  const prenom = texte(donnees, "prenom");
  const telephone = texte(donnees, "telephone");
  const email = texte(donnees, "email");

  if (!prenom) return { erreur: "Le prénom est nécessaire." };

  /**
   * Le serveur refuserait de toute façon un dossier sans moyen de contact,
   * mais le dire ici évite un aller-retour et une phrase d'erreur générique.
   * Sans numéro ni adresse, le suivi est précisément ce qu'on ne pourra pas
   * faire.
   */
  if (!telephone && !email) {
    return { erreur: "Renseignez un téléphone ou une adresse e-mail." };
  }

  const consentement = donnees.get("consentement") === "on";
  let id: string;

  try {
    const cree = await api.creerConverti({
      firstName: prenom,
      lastName: texte(donnees, "nom") || null,
      phone: telephone || null,
      email: email || null,
      sex: texte(donnees, "sexe") || null,
      status: texte(donnees, "statut") || "reflexion",
      sectorId: texte(donnees, "secteur") || null,
      notes: texte(donnees, "notes") || null,
      consented: consentement,
    });

    // Une première visite, comme sur le mobile : un dossier sans échéance
    // se perd dans la liste et n'est jamais rouvert.
    await api.planifierVisite(cree.id, dansJours(DELAI_VISITE));
    id = cree.id;
  } catch (erreur) {
    return echec(erreur);
  }

  revalidatePath("/convertis");
  revalidatePath("/aujourdhui");
  redirect(`/convertis/${id}`);
}

export async function modifierConverti(
  _precedent: Retour,
  donnees: FormData,
): Promise<Retour> {
  const id = texte(donnees, "id");
  const telephone = texte(donnees, "telephone");
  const email = texte(donnees, "email");

  if (!telephone && !email) {
    return { erreur: "Renseignez un téléphone ou une adresse e-mail." };
  }

  try {
    await api.modifierConverti(id, {
      firstName: texte(donnees, "prenom"),
      lastName: texte(donnees, "nom") || null,
      phone: telephone || null,
      email: email || null,
      sex: texte(donnees, "sexe") || null,
      status: texte(donnees, "statut"),
      sectorId: texte(donnees, "secteur") || null,
      notes: texte(donnees, "notes") || null,
    });
  } catch (erreur) {
    return echec(erreur);
  }

  revalidatePath(`/convertis/${id}`);
  revalidatePath("/convertis");
  return OK;
}

export async function changerStatut(donnees: FormData): Promise<void> {
  const id = texte(donnees, "id");

  try {
    await api.modifierConverti(id, { status: texte(donnees, "statut") });
  } catch (erreur) {
    if (erreur instanceof SessionExpiree) throw erreur;
  }

  revalidatePath(`/convertis/${id}`);
  revalidatePath("/convertis");
}

export async function supprimerConverti(donnees: FormData): Promise<void> {
  const id = texte(donnees, "id");

  try {
    await api.supprimerConverti(id);
  } catch (erreur) {
    if (erreur instanceof SessionExpiree) throw erreur;
  }

  revalidatePath("/convertis");
  revalidatePath("/aujourdhui");
  redirect("/convertis");
}

export async function ajouterNote(
  _precedent: Retour,
  donnees: FormData,
): Promise<Retour> {
  const id = texte(donnees, "id");
  const contenu = texte(donnees, "texte");

  if (!contenu) return { erreur: "La note est vide." };

  try {
    if (donnees.get("appel") === "on") await api.consignerAppel(id, contenu);
    else await api.ajouterNote(id, contenu);
  } catch (erreur) {
    return echec(erreur);
  }

  revalidatePath(`/convertis/${id}`);
  return OK;
}

/* ------------------------------------------------------------------ *
 * Visites
 * ------------------------------------------------------------------ */

export async function planifierVisite(donnees: FormData): Promise<void> {
  const id = texte(donnees, "id");
  const date = texte(donnees, "date");

  /**
   * Une date saisie est interprétée à 10 h locale : `2026-09-04` seul serait
   * lu comme minuit UTC, ce qui affiche la veille au soir pour un utilisateur
   * à l'ouest de Greenwich.
   */
  const quand = date
    ? new Date(`${date}T10:00:00`).toISOString()
    : dansJours(DELAI_VISITE);

  try {
    await api.planifierVisite(id, quand);
  } catch (erreur) {
    if (erreur instanceof SessionExpiree) throw erreur;
  }

  revalidatePath(`/convertis/${id}`);
  revalidatePath("/aujourdhui");
  revalidatePath("/convertis");
}

export async function cloreVisite(donnees: FormData): Promise<void> {
  const idVisite = texte(donnees, "visite");
  const idConverti = texte(donnees, "converti");
  const rapport = texte(donnees, "rapport");

  try {
    await api.modifierVisite(idVisite, {
      status: "done",
      ...(rapport ? { report: rapport } : {}),
    });
  } catch (erreur) {
    if (erreur instanceof SessionExpiree) throw erreur;
  }

  if (idConverti) revalidatePath(`/convertis/${idConverti}`);
  revalidatePath("/aujourdhui");
  revalidatePath("/convertis");
}

/* ------------------------------------------------------------------ *
 * Secteurs
 * ------------------------------------------------------------------ */

export async function creerSecteur(
  _precedent: Retour,
  donnees: FormData,
): Promise<Retour> {
  const nom = texte(donnees, "nom");
  if (!nom) return { erreur: "Le nom du secteur est nécessaire." };

  try {
    await api.creerSecteur({
      name: nom,
      city: texte(donnees, "ville") || null,
      country: texte(donnees, "pays") || null,
    });
  } catch (erreur) {
    return echec(erreur);
  }

  revalidatePath("/secteurs");
  return OK;
}

export async function supprimerSecteur(donnees: FormData): Promise<void> {
  try {
    await api.supprimerSecteur(texte(donnees, "id"));
  } catch (erreur) {
    if (erreur instanceof SessionExpiree) throw erreur;
  }

  revalidatePath("/secteurs");
  revalidatePath("/convertis");
}
