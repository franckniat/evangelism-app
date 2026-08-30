import "server-only";

import type {
  AuthDto,
  ConvertDto,
  EventDto,
  SectorDto,
  UserDto,
  VisitDto,
} from "@harvest/core";

import { lireJetons } from "@/lib/session";

/**
 * Le seul chemin vers l'API, et il passe par le serveur.
 *
 * `API_URL` n'est délibérément pas préfixée `NEXT_PUBLIC_` : le navigateur
 * n'a pas à connaître l'adresse de l'API, et surtout pas à l'appeler
 * lui-même. Toutes les requêtes partent d'ici, avec le jeton lu dans un
 * cookie que le script de la page ne peut pas voir.
 */
const API_URL = (process.env.API_URL ?? "http://localhost:3333/api/v1").replace(
  /\/+$/,
  "",
);

/** Le serveur a répondu, mais négativement. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = "ApiError";
  }

  /** Les messages de validation, dans l'ordre où l'API les a produits. */
  get messages(): string[] {
    const corps = this.payload as
      | { errors?: { message?: string }[]; message?: string }
      | null;

    const liste = corps?.errors?.map((e) => e.message).filter(Boolean);
    if (liste?.length) return liste as string[];
    return corps?.message ? [corps.message] : [];
  }
}

/**
 * Le jeton d'accès a expiré.
 *
 * Renouveler demande d'écrire des cookies, ce qu'un composant serveur ne
 * peut pas faire — la réponse a déjà commencé à être envoyée. On remonte
 * donc le fait, et la mise en page protégée redirige vers le gestionnaire
 * de route qui, lui, en a le droit.
 */
export class SessionExpiree extends Error {
  constructor() {
    super("session expirée");
    this.name = "SessionExpiree";
  }
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  jeton?: string;
  anonyme?: boolean;
};

async function requete<T>(chemin: string, options: Options = {}): Promise<T> {
  const jeton = options.jeton ?? (await lireJetons())?.acces;

  if (!options.anonyme && !jeton) throw new SessionExpiree();

  const entetes: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) entetes["Content-Type"] = "application/json";
  if (!options.anonyme && jeton) entetes.Authorization = `Bearer ${jeton}`;

  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: options.method ?? "GET",
    headers: entetes,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),

    /**
     * Aucune mise en cache : ces réponses portent des données personnelles
     * et sont propres à une session. Une page mise en cache, c'est le
     * fichier de suivi d'une personne servi à une autre.
     */
    cache: "no-store",
  });

  if (reponse.status === 401 && !options.anonyme) throw new SessionExpiree();

  if (!reponse.ok) {
    let charge: unknown = null;
    try {
      charge = await reponse.json();
    } catch {
      // corps illisible : le code de statut suffit
    }
    throw new ApiError(reponse.status, charge);
  }

  if (reponse.status === 204) return undefined as T;

  const corps = (await reponse.json()) as { data?: T };
  return (corps?.data ?? (corps as unknown)) as T;
}

/* ------------------------------------------------------------------ *
 * Authentification — appelée uniquement depuis les actions serveur
 * ------------------------------------------------------------------ */

export const auth = {
  connexion: (email: string, motDePasse: string) =>
    requete<AuthDto>("/auth/login", {
      method: "POST",
      anonyme: true,
      body: { email, password: motDePasse },
    }),

  inscription: (input: {
    fullName: string;
    email: string;
    password: string;
    church: string | null;
  }) =>
    requete<AuthDto>("/auth/signup", {
      method: "POST",
      anonyme: true,
      body: { ...input, passwordConfirmation: input.password },
    }),

  rotation: (jetonDeRafraichissement: string) =>
    requete<AuthDto>("/auth/refresh", {
      method: "POST",
      anonyme: true,
      body: { refreshToken: jetonDeRafraichissement },
    }),

  deconnexion: (jeton: string, jetonDeRafraichissement: string) =>
    requete<{ message: string }>("/account/logout", {
      method: "POST",
      jeton,
      body: { refreshToken: jetonDeRafraichissement },
    }),
};

/* ------------------------------------------------------------------ *
 * Métier
 * ------------------------------------------------------------------ */

export const api = {
  profil: () => requete<UserDto>("/account/profile"),

  modifierProfil: (patch: { fullName?: string; church?: string | null }) =>
    requete<UserDto>("/account/profile", { method: "PATCH", body: patch }),

  convertis: (parametres?: {
    search?: string;
    sectorId?: string;
    status?: string;
  }) => {
    const q = new URLSearchParams({ perPage: "100" });
    if (parametres?.search) q.set("search", parametres.search);
    if (parametres?.sectorId) q.set("sectorId", parametres.sectorId);
    if (parametres?.status) q.set("status", parametres.status);
    return requete<{ converts: ConvertDto[] }>(`/converts?${q}`);
  },

  converti: (id: string) =>
    requete<{ convert: ConvertDto; visits: VisitDto[]; events: EventDto[] }>(
      `/converts/${id}`,
    ),

  creerConverti: (body: Record<string, unknown>) =>
    requete<ConvertDto>("/converts", { method: "POST", body }),

  modifierConverti: (id: string, body: Record<string, unknown>) =>
    requete<ConvertDto>(`/converts/${id}`, { method: "PATCH", body }),

  supprimerConverti: (id: string) =>
    requete<{ message: string }>(`/converts/${id}`, { method: "DELETE" }),

  ajouterNote: (id: string, text: string) =>
    requete<EventDto>(`/converts/${id}/notes`, { method: "POST", body: { text } }),

  consignerAppel: (id: string, text: string) =>
    requete<EventDto>(`/converts/${id}/calls`, { method: "POST", body: { text } }),

  secteurs: () => requete<{ sectors: SectorDto[] }>("/sectors"),

  creerSecteur: (body: Record<string, unknown>) =>
    requete<SectorDto>("/sectors", { method: "POST", body }),

  modifierSecteur: (id: string, body: Record<string, unknown>) =>
    requete<SectorDto>(`/sectors/${id}`, { method: "PATCH", body }),

  supprimerSecteur: (id: string) =>
    requete<{ message: string }>(`/sectors/${id}`, { method: "DELETE" }),

  visites: (scope: "upcoming" | "today" | "overdue" | "all" = "all") =>
    requete<{ visits: VisitDto[] }>(`/visits?scope=${scope}`),

  planifierVisite: (convertId: string, scheduledAt: string) =>
    requete<VisitDto>("/visits", {
      method: "POST",
      body: { convertId, scheduledAt },
    }),

  modifierVisite: (id: string, body: Record<string, unknown>) =>
    requete<VisitDto>(`/visits/${id}`, { method: "PATCH", body }),

  supprimerVisite: (id: string) =>
    requete<{ message: string }>(`/visits/${id}`, { method: "DELETE" }),
};
