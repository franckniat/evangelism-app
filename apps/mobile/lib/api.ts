/**
 * Le client HTTP de Moisson.
 *
 * Trois choses lui sont demandées, et rien d'autre :
 *
 *  1. porter le jeton d'accès et le renouveler quand il expire, sans que
 *     l'appelant ait à s'en occuper ;
 *  2. distinguer « le réseau est absent » de « le serveur a refusé ». Cette
 *     distinction est la clé de tout le mode hors ligne : une panne réseau se
 *     réessaie, un refus du serveur ne se réessaie jamais ;
 *  3. ne jamais laisser filtrer un jeton ailleurs que dans l'en-tête
 *     `Authorization`.
 */
import type { AuthDto, ConvertDto, EventDto, SectorDto, UserDto, VisitDto } from '@moisson/core';

import { API_URL } from '@/lib/config';
import { clearSession, loadSession, saveSession, type StoredSession } from '@/lib/session';

/** Le serveur a répondu, mais négativement. Ne pas réessayer tel quel. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown
  ) {
    super(`HTTP ${status}`);
    this.name = 'ApiError';
  }

  /** Erreurs de saisie ou d'autorisation : réessayer donnera le même refus. */
  get isDefinitive() {
    return this.status >= 400 && this.status < 500 && this.status !== 401 && this.status !== 429;
  }
}

/** La requête n'a pas atteint le serveur. Réessayable telle quelle. */
export class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}

/**
 * La session en mémoire. Elle est la référence pendant l'exécution ; le
 * trousseau n'est là que pour survivre à la fermeture de l'application.
 */
let session: StoredSession | null = null;
let restored = false;

export async function restoreSession(): Promise<boolean> {
  if (!restored) {
    session = await loadSession();
    restored = true;
  }
  return session != null;
}

export async function setSession(next: StoredSession | null): Promise<void> {
  session = next;
  restored = true;
  if (next) await saveSession(next);
  else await clearSession();
}

export function hasSession(): boolean {
  return session != null;
}

function sessionFromAuth(auth: AuthDto): StoredSession {
  return {
    accessToken: auth.accessToken.value,
    accessExpiresAt: auth.accessToken.expiresAt,
    refreshToken: auth.refreshToken.value,
  };
}

/* ------------------------------------------------------------------ *
 * Renouvellement
 * ------------------------------------------------------------------ */

/**
 * Un seul renouvellement à la fois.
 *
 * Sans ce verrou, cinq requêtes qui expirent ensemble déclenchent cinq
 * rotations concurrentes. Le serveur invalide un jeton de rafraîchissement
 * dès qu'il est utilisé et considère une seconde présentation comme un vol :
 * il révoquerait toute la famille et déconnecterait l'appareil. La rotation
 * est donc partagée entre les appels simultanés.
 */
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const current = session;
    if (!current) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });

      if (!response.ok) {
        // Rafraîchissement refusé : la session est morte, pas le réseau.
        await setSession(null);
        return false;
      }

      const body = (await response.json()) as { data: AuthDto };
      await setSession(sessionFromAuth(body.data));
      return true;
    } catch {
      // Réseau absent : la session reste valable, on réessaiera plus tard.
      throw new OfflineError();
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/* ------------------------------------------------------------------ *
 * Requête
 * ------------------------------------------------------------------ */

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Requêtes d'authentification : pas de jeton, pas de renouvellement. */
  anonymous?: boolean;
};

async function send<T>(path: string, options: Options = {}, retrying = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!options.anonymous && session) headers.Authorization = `Bearer ${session.accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new OfflineError();
  }

  if (response.status === 401 && !options.anonymous && !retrying) {
    const renewed = await refreshSession();
    if (renewed) return send<T>(path, options, true);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // corps illisible : le code de statut suffit
    }
    throw new ApiError(response.status, payload);
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json()) as { data?: T };
  return (body?.data ?? (body as unknown)) as T;
}

/* ------------------------------------------------------------------ *
 * Les routes
 * ------------------------------------------------------------------ */

export const api = {
  async signup(input: {
    fullName: string;
    email: string;
    password: string;
    church: string | null;
  }): Promise<AuthDto> {
    const auth = await send<AuthDto>('/auth/signup', {
      method: 'POST',
      anonymous: true,
      body: { ...input, passwordConfirmation: input.password },
    });
    await setSession(sessionFromAuth(auth));
    return auth;
  },

  async login(email: string, password: string): Promise<AuthDto> {
    const auth = await send<AuthDto>('/auth/login', {
      method: 'POST',
      anonymous: true,
      body: { email, password },
    });
    await setSession(sessionFromAuth(auth));
    return auth;
  },

  async logout(): Promise<void> {
    const refreshToken = session?.refreshToken;
    try {
      await send('/account/logout', { method: 'POST', body: { refreshToken } });
    } catch {
      /**
       * Se déconnecter doit fonctionner même hors ligne. Les jetons partent
       * du téléphone dans tous les cas ; la session résiduelle côté serveur
       * expirera d'elle-même.
       */
    }
    await setSession(null);
  },

  profile: () => send<UserDto>('/account/profile'),

  updateProfile: (patch: { fullName?: string; church?: string | null }) =>
    send<UserDto>('/account/profile', { method: 'PATCH', body: patch }),

  listConverts: () =>
    send<{ converts: ConvertDto[]; meta: unknown }>('/converts?perPage=100'),

  showConvert: (id: string) =>
    send<{ convert: ConvertDto; visits: VisitDto[]; events: EventDto[] }>(`/converts/${id}`),

  createConvert: (body: Record<string, unknown>) =>
    send<ConvertDto>('/converts', { method: 'POST', body }),

  updateConvert: (id: string, body: Record<string, unknown>) =>
    send<ConvertDto>(`/converts/${id}`, { method: 'PATCH', body }),

  deleteConvert: (id: string) => send<void>(`/converts/${id}`, { method: 'DELETE' }),

  addNote: (convertId: string, text: string) =>
    send<EventDto>(`/converts/${convertId}/notes`, { method: 'POST', body: { text } }),

  logCall: (convertId: string, text: string) =>
    send<EventDto>(`/converts/${convertId}/calls`, { method: 'POST', body: { text } }),

  listSectors: () => send<{ sectors: SectorDto[] }>('/sectors'),

  createSector: (body: Record<string, unknown>) =>
    send<SectorDto>('/sectors', { method: 'POST', body }),

  updateSector: (id: string, body: Record<string, unknown>) =>
    send<SectorDto>(`/sectors/${id}`, { method: 'PATCH', body }),

  deleteSector: (id: string) => send<void>(`/sectors/${id}`, { method: 'DELETE' }),

  listVisits: (scope: 'upcoming' | 'today' | 'overdue' | 'all' = 'all') =>
    send<{ visits: VisitDto[] }>(`/visits?scope=${scope}`),

  createVisit: (body: Record<string, unknown>) =>
    send<VisitDto>('/visits', { method: 'POST', body }),

  updateVisit: (id: string, body: Record<string, unknown>) =>
    send<VisitDto>(`/visits/${id}`, { method: 'PATCH', body }),

  deleteVisit: (id: string) => send<void>(`/visits/${id}`, { method: 'DELETE' }),
};
