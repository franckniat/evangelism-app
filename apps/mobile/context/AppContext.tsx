/**
 * L'état de l'application, et le seul endroit qui parle au serveur.
 *
 * Le principe est constant d'une action à l'autre : **on écrit d'abord
 * localement, on prévient le serveur ensuite.** Un évangéliste saisit un
 * contact debout dans une cour, souvent sans réseau ; une interface qui
 * attend une réponse HTTP avant d'afficher un nom est inutilisable là-bas.
 *
 * Chaque action suit donc trois temps :
 *   1. un identifiant définitif est tiré sur l'appareil (UUID v4) ;
 *   2. l'état local est modifié — l'écran répond immédiatement ;
 *   3. la modification est déposée dans la file (`lib/outbox`), qui la
 *      remettra au serveur dès qu'une requête passera.
 *
 * Ce que ce fichier ne fait pas : résoudre des conflits. Le MVP ne connaît
 * qu'un utilisateur par compte, et une personne ne modifie pas la même fiche
 * sur deux téléphones à la même seconde. Le jour où des convertis seront
 * partagés entre gagneurs d'âmes, cette hypothèse tombera — et il faudra la
 * remplacer par une vraie fusion, pas par un « dernier arrivé gagne » ajouté
 * discrètement ici.
 */
import * as Crypto from 'expo-crypto';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { DICT, type Dict, type Lang } from '@/constants/i18n';
import type { StatusKey } from '@/constants/status';
import { ApiError, OfflineError, api, hasSession, restoreSession } from '@/lib/api';
import { isoFromOffset } from '@/lib/dates';
import { aDesDonneesLocales, reprendreDonneesLocales } from '@/lib/migration';
import { cancelReminder, scheduleVisitReminder } from '@/lib/notifications';
import {
  clearOutbox,
  drain,
  enqueue,
  forgetLocalConvert,
  forgetLocalSector,
  loadOutbox,
  pendingCount,
} from '@/lib/outbox';
import {
  KEYS,
  clearAccountCache,
  loadAppState,
  setJSON,
  type PersistedState,
  type PlannedVisits,
} from '@/lib/storage';
import {
  convertFromDto,
  historyFromEvents,
  payloadFromConvert,
  sectorFromDto,
  type Convert,
  type Evangelist,
  type Sector,
  type Sexe,
  type ThemePref,
  type UserDto,
} from '@/lib/types';

type AppState = PersistedState & {
  hydrated: boolean;
  /** Modifications encore dans la file d'envoi. */
  pending: number;
  /** Vrai quand la dernière tentative d'envoi n'a pas atteint le serveur. */
  offline: boolean;
  /** Vrai quand le serveur a refusé une modification déjà appliquée ici. */
  rejected: boolean;
};

const initialState: AppState = {
  introSeen: false,
  user: null,
  photoUri: null,
  converts: [],
  sectors: [],
  plannedVisits: {},
  notifications: [],
  lang: 'fr',
  settings: { notifOn: true, appLock: false, themePref: 'system' },
  hydrated: false,
  pending: 0,
  offline: false,
  rejected: false,
};

type Action =
  | { type: 'HYDRATE'; payload: PersistedState; pending: number }
  | { type: 'SET_INTRO_SEEN' }
  | { type: 'SIGNED_IN'; user: UserDto }
  | { type: 'SIGNED_OUT' }
  | { type: 'SET_USER'; user: UserDto }
  | { type: 'SET_PHOTO'; photoUri: string | null }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'SET_SETTINGS'; patch: Partial<AppState['settings']> }
  | { type: 'REPLACE_DATA'; converts: Convert[]; sectors: Sector[]; plannedVisits: PlannedVisits }
  | { type: 'ADD_CONVERT'; convert: Convert }
  | { type: 'UPDATE_CONVERT'; id: string; patch: Partial<Convert> }
  | { type: 'DELETE_CONVERT'; id: string }
  | { type: 'SET_PLANNED_VISIT'; convertId: string; visit: { visitId: string; scheduledAt: string } | null }
  | { type: 'ADD_SECTOR'; sector: Sector }
  | { type: 'UPDATE_SECTOR'; id: string; patch: Partial<Sector> }
  | { type: 'DELETE_SECTOR'; id: string }
  | { type: 'SET_NOTIFICATIONS'; notifications: AppState['notifications'] }
  | { type: 'SYNC'; pending: number; offline: boolean; rejected: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, pending: action.pending, hydrated: true };
    case 'SET_INTRO_SEEN':
      return { ...state, introSeen: true };
    case 'SIGNED_IN':
      return { ...state, user: action.user };
    case 'SIGNED_OUT':
      return {
        ...state,
        user: null,
        photoUri: null,
        converts: [],
        sectors: [],
        plannedVisits: {},
        notifications: [],
        pending: 0,
        rejected: false,
      };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'SET_PHOTO':
      return { ...state, photoUri: action.photoUri };
    case 'SET_LANG':
      return { ...state, lang: action.lang };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'REPLACE_DATA':
      return {
        ...state,
        converts: action.converts,
        sectors: action.sectors,
        plannedVisits: action.plannedVisits,
      };
    case 'ADD_CONVERT':
      return { ...state, converts: [action.convert, ...state.converts] };
    case 'UPDATE_CONVERT':
      return {
        ...state,
        converts: state.converts.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case 'DELETE_CONVERT': {
      const plannedVisits = { ...state.plannedVisits };
      delete plannedVisits[action.id];
      return {
        ...state,
        converts: state.converts.filter((c) => c.id !== action.id),
        plannedVisits,
      };
    }
    case 'SET_PLANNED_VISIT': {
      const plannedVisits = { ...state.plannedVisits };
      if (action.visit) plannedVisits[action.convertId] = action.visit;
      else delete plannedVisits[action.convertId];
      return { ...state, plannedVisits };
    }
    case 'ADD_SECTOR':
      return { ...state, sectors: [...state.sectors, action.sector] };
    case 'UPDATE_SECTOR':
      return {
        ...state,
        sectors: state.sectors.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
      };
    case 'DELETE_SECTOR':
      return { ...state, sectors: state.sectors.filter((s) => s.id !== action.id) };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.notifications };
    case 'SYNC':
      return {
        ...state,
        pending: action.pending,
        offline: action.offline,
        rejected: action.rejected,
      };
    default:
      return state;
  }
}

export type ConvertFields = {
  prenom: string;
  nom: string;
  tel: string;
  sexe: Sexe;
  secteur: string;
  statut: StatusKey;
  notes: string;
};

export type RegisterInput = {
  name: string;
  church: string;
  password: string;
  email: string;
  photoUri?: string | null;
};

export type ProfilePatch = { name?: string; church?: string; photoUri?: string | null };

/** Pourquoi une connexion a échoué — l'utilisateur ne peut pas agir sans le savoir. */
export type AuthFailure = 'credentials' | 'taken' | 'offline' | 'throttled' | 'invalid';
export type AuthResult = { ok: true } | { ok: false; error: AuthFailure };

type AppContextValue = {
  hydrated: boolean;
  introSeen: boolean;
  lang: Lang;
  t: Dict;
  currentUser: Evangelist | null;
  isAuthenticated: boolean;
  converts: Convert[];
  sectors: Sector[];
  notifications: AppState['notifications'];
  settings: AppState['settings'];
  unreadCount: number;
  // synchronisation
  pending: number;
  offline: boolean;
  rejected: boolean;
  syncNow: () => Promise<void>;
  loadConvertHistory: (id: string) => Promise<void>;
  // onboarding
  markIntroSeen: () => void;
  // authentification
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  logout: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  // préférences
  setLang: (lang: Lang) => void;
  toggleNotif: () => void;
  setAppLock: (value: boolean) => void;
  setThemePref: (pref: ThemePref) => void;
  // convertis
  addConvert: (input: ConvertFields) => string;
  updateConvert: (id: string, input: ConvertFields) => void;
  deleteConvert: (id: string) => void;
  setStatus: (id: string, statut: StatusKey) => void;
  planVisit: (id: string) => Promise<void>;
  toggleTask: (id: string) => void;
  // secteurs
  addSector: (name: string, ville: string, pays: string) => void;
  updateSector: (id: string, name: string, ville: string, pays: string) => void;
  deleteSector: (id: string) => void;
  // notifications
  markNotifRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/** Délai par défaut avant la prochaine visite, en jours. */
const DELAI_VISITE = 3;

const uuid = () => Crypto.randomUUID();

/** Une erreur de saisie renvoyée par le serveur, pas une panne. */
function statusOf(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /**
   * L'état vu par les fonctions asynchrones.
   *
   * Un `useCallback` capture l'état de son rendu ; entre le moment où
   * l'utilisateur appuie et celui où la requête part, l'état a pu changer.
   * Cette référence donne toujours la version courante.
   */
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  /* ---------------------------------------------------------------- *
   * Chargement initial et persistance du cache
   * ---------------------------------------------------------------- */

  useEffect(() => {
    let active = true;

    (async () => {
      const [payload, pending, session] = await Promise.all([
        loadAppState(),
        loadOutbox(),
        restoreSession(),
      ]);
      if (!active) return;

      /**
       * Le cache peut décrire un compte dont les jetons ont disparu —
       * réinstallation du trousseau, session révoquée depuis un autre
       * appareil. Sans jetons il n'y a pas de session : on efface plutôt
       * que d'afficher des dossiers qu'on ne peut plus ni lire ni écrire.
       */
      if (!session && payload.user) {
        await clearAccountCache();
        dispatch({ type: 'HYDRATE', payload: { ...payload, user: null, converts: [], sectors: [], plannedVisits: {}, notifications: [] }, pending });
        return;
      }

      dispatch({ type: 'HYDRATE', payload, pending });
    })();

    return () => {
      active = false;
    };
  }, []);

  const { hydrated } = state;
  useEffect(() => {
    if (hydrated) setJSON(KEYS.introSeen, state.introSeen);
  }, [hydrated, state.introSeen]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.user, state.user);
  }, [hydrated, state.user]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.photoUri, state.photoUri);
  }, [hydrated, state.photoUri]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.converts, state.converts);
  }, [hydrated, state.converts]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.sectors, state.sectors);
  }, [hydrated, state.sectors]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.plannedVisits, state.plannedVisits);
  }, [hydrated, state.plannedVisits]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.notifications, state.notifications);
  }, [hydrated, state.notifications]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.lang, state.lang);
  }, [hydrated, state.lang]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.settings, state.settings);
  }, [hydrated, state.settings]);

  const t = DICT[state.lang];

  /* ---------------------------------------------------------------- *
   * Synchronisation
   * ---------------------------------------------------------------- */

  /**
   * Rapatrie l'état du serveur et remplace le cache.
   *
   * L'ordre compte : on vide d'abord la file, on relit ensuite. L'inverse
   * ferait disparaître de l'écran, le temps d'un rafraîchissement, une
   * saisie encore en attente d'envoi.
   */
  const pull = useCallback(async () => {
    const [{ sectors: sectorDtos }, { converts: convertDtos }, { visits }] = await Promise.all([
      api.listSectors(),
      api.listConverts(),
      api.listVisits('upcoming'),
    ]);

    const sectors = sectorDtos.map(sectorFromDto);
    const noms = new Map(sectorDtos.map((s) => [s.id, s.name]));
    const connus = new Map(latest.current.converts.map((c) => [c.id, c]));

    const converts = convertDtos.map((dto) =>
      convertFromDto(dto, noms, latest.current.lang, connus.get(dto.id))
    );

    /**
     * L'interface ne montre qu'une échéance par converti ; le serveur, lui,
     * connaît des visites. On retient la plus proche encore planifiée, celle
     * que l'écran affiche et que la case à cocher clôturera.
     */
    const plannedVisits: PlannedVisits = {};
    for (const v of visits) {
      if (v.status !== 'planned' || !v.scheduledAt) continue;
      const courante = plannedVisits[v.convertId];
      if (!courante || v.scheduledAt < courante.scheduledAt) {
        plannedVisits[v.convertId] = { visitId: v.id, scheduledAt: v.scheduledAt };
      }
    }

    dispatch({ type: 'REPLACE_DATA', converts, sectors, plannedVisits });
  }, []);

  const syncNow = useCallback(async () => {
    if (!hasSession()) return;

    /**
     * Reprise des saisies antérieures au serveur, une fois pour toutes.
     *
     * Elle doit passer avant tout rafraîchissement : sans elle, le premier
     * `pull` remplacerait le contenu de l'appareil par celui du compte —
     * vide — et effacerait sans un mot le travail déjà fait. Le test se
     * fonde sur la forme des identifiants, donc il devient faux de lui-même
     * dès que la reprise a eu lieu.
     */
    const { converts, sectors, plannedVisits } = latest.current;
    if (aDesDonneesLocales(converts, sectors)) {
      const reprise = await reprendreDonneesLocales(converts, sectors, plannedVisits);
      dispatch({
        type: 'REPLACE_DATA',
        converts: reprise.converts,
        sectors: reprise.sectors,
        plannedVisits: reprise.plannedVisits,
      });
      latest.current = {
        ...latest.current,
        converts: reprise.converts,
        sectors: reprise.sectors,
        plannedVisits: reprise.plannedVisits,
      };
    }

    const result = await drain();

    if (result.offline || result.pending > 0) {
      dispatch({
        type: 'SYNC',
        pending: result.pending,
        offline: result.offline,
        rejected: result.rejected.length > 0,
      });
      return;
    }

    try {
      await pull();
      dispatch({ type: 'SYNC', pending: 0, offline: false, rejected: result.rejected.length > 0 });
    } catch (error) {
      dispatch({
        type: 'SYNC',
        pending: 0,
        offline: error instanceof OfflineError,
        rejected: result.rejected.length > 0,
      });
    }
  }, [pull]);

  /** Une synchronisation à l'ouverture, puis à chaque reconnexion réussie. */
  useEffect(() => {
    if (state.hydrated && state.user) void syncNow();
    // Volontairement limité au passage à l'état « prêt » : les autres
    // synchronisations sont déclenchées par les actions elles-mêmes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hydrated, state.user?.id]);

  /** Dépose une modification puis tente de vider la file, sans bloquer l'écran. */
  const push = useCallback(
    (mutation: Parameters<typeof enqueue>[0]) => {
      void (async () => {
        await enqueue(mutation);
        dispatch({ type: 'SYNC', pending: pendingCount(), offline: false, rejected: false });
        await syncNow();
      })();
    },
    [syncNow]
  );

  /* ---------------------------------------------------------------- *
   * Authentification
   * ---------------------------------------------------------------- */

  const markIntroSeen = useCallback(() => dispatch({ type: 'SET_INTRO_SEEN' }), []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const auth = await api.login(email.trim().toLowerCase(), password);
        dispatch({ type: 'SIGNED_IN', user: auth.user });
        return { ok: true };
      } catch (error) {
        if (error instanceof OfflineError) return { ok: false, error: 'offline' };
        const status = statusOf(error);
        if (status === 429) return { ok: false, error: 'throttled' };
        return { ok: false, error: 'credentials' };
      }
    },
    []
  );

  const register = useCallback(async (input: RegisterInput): Promise<AuthResult> => {
    try {
      const auth = await api.signup({
        fullName: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        church: input.church.trim() || null,
      });

      dispatch({ type: 'SIGNED_IN', user: auth.user });
      dispatch({ type: 'SET_PHOTO', photoUri: input.photoUri ?? null });
      return { ok: true };
    } catch (error) {
      if (error instanceof OfflineError) return { ok: false, error: 'offline' };

      /**
       * 422 couvre deux cas que l'utilisateur vit très différemment :
       * l'adresse est déjà prise, ou la saisie ne convient pas. Le serveur
       * les distingue par la règle en défaut, alors on la lit.
       */
      if (statusOf(error) === 422) {
        const payload = (error as ApiError).payload as
          | { errors?: { rule?: string; field?: string }[] }
          | null;
        const prise = payload?.errors?.some((e) => e.rule === 'database.unique');
        return { ok: false, error: prise ? 'taken' : 'invalid' };
      }

      return { ok: false, error: 'invalid' };
    }
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      for (const c of latest.current.converts) await cancelReminder(c.reminderId);
      await api.logout();
      await clearOutbox();
      await clearAccountCache();
      dispatch({ type: 'SIGNED_OUT' });
    })();
  }, []);

  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      if (patch.photoUri !== undefined) {
        dispatch({ type: 'SET_PHOTO', photoUri: patch.photoUri });
      }

      const user = latest.current.user;
      if (!user) return;
      if (patch.name === undefined && patch.church === undefined) return;

      const body = {
        ...(patch.name !== undefined ? { fullName: patch.name } : {}),
        ...(patch.church !== undefined ? { church: patch.church || null } : {}),
      };

      dispatch({
        type: 'SET_USER',
        user: {
          ...user,
          ...(patch.name !== undefined ? { fullName: patch.name } : {}),
          ...(patch.church !== undefined ? { church: patch.church || null } : {}),
        },
      });

      push({ id: uuid(), kind: 'profile.update', body });
    },
    [push]
  );

  /* ---------------------------------------------------------------- *
   * Préférences — locales à l'appareil, jamais envoyées
   * ---------------------------------------------------------------- */

  const setLang = useCallback((lang: Lang) => dispatch({ type: 'SET_LANG', lang }), []);
  const toggleNotif = useCallback(
    () => dispatch({ type: 'SET_SETTINGS', patch: { notifOn: !latest.current.settings.notifOn } }),
    []
  );
  const setAppLock = useCallback(
    (value: boolean) => dispatch({ type: 'SET_SETTINGS', patch: { appLock: value } }),
    []
  );
  const setThemePref = useCallback(
    (pref: ThemePref) => dispatch({ type: 'SET_SETTINGS', patch: { themePref: pref } }),
    []
  );

  /* ---------------------------------------------------------------- *
   * Convertis
   * ---------------------------------------------------------------- */

  const sectorIds = useCallback(
    () => new Map(latest.current.sectors.map((s) => [s.name, s.id])),
    []
  );

  const addConvert = useCallback(
    (input: ConvertFields) => {
      const id = uuid();
      const visitId = uuid();
      const nextVisit = isoFromOffset(DELAI_VISITE);
      const scheduledAt = new Date(`${nextVisit}T10:00:00`).toISOString();

      const convert: Convert = {
        id,
        prenom: input.prenom.trim(),
        nom: input.nom.trim(),
        tel: input.tel.trim(),
        sexe: input.sexe,
        secteur: input.secteur,
        statut: input.statut,
        nextVisit,
        done: false,
        added: t.due_today,
        notes: input.notes.trim() || '—',
        history: [{ date: t.due_today, text: t.hist_first }],
        reminderId: null,
      };

      dispatch({ type: 'ADD_CONVERT', convert });
      dispatch({ type: 'SET_PLANNED_VISIT', convertId: id, visit: { visitId, scheduledAt } });

      /**
       * Le consentement est transmis à la création et à elle seule : c'est
       * là qu'il a été recueilli, sur le terrain, en informant la personne
       * que ses coordonnées sont conservées pour la recontacter.
       */
      push({
        id: uuid(),
        kind: 'convert.create',
        convertId: id,
        body: { ...payloadFromConvert(convert, sectorIds()), consented: true },
      });

      push({ id: uuid(), kind: 'visit.create', visitId, convertId: id, scheduledAt });

      return id;
    },
    [push, sectorIds, t]
  );

  const updateConvert = useCallback(
    (id: string, input: ConvertFields) => {
      const patch = {
        prenom: input.prenom.trim(),
        nom: input.nom.trim(),
        tel: input.tel.trim(),
        sexe: input.sexe,
        secteur: input.secteur,
        statut: input.statut,
        notes: input.notes.trim() || '—',
      };

      dispatch({ type: 'UPDATE_CONVERT', id, patch });
      push({
        id: uuid(),
        kind: 'convert.update',
        convertId: id,
        body: payloadFromConvert(patch, sectorIds()),
      });
    },
    [push, sectorIds]
  );

  const deleteConvert = useCallback(
    (id: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (c) void cancelReminder(c.reminderId);

      dispatch({ type: 'DELETE_CONVERT', id });

      void (async () => {
        /**
         * Créé puis supprimé sans jamais avoir atteint le serveur : les deux
         * requêtes s'annulent. Inutile d'aller créer une fiche pour
         * l'effacer aussitôt.
         */
        const oublie = await forgetLocalConvert(id);
        if (oublie) {
          dispatch({ type: 'SYNC', pending: pendingCount(), offline: false, rejected: false });
          return;
        }
        push({ id: uuid(), kind: 'convert.delete', convertId: id });
      })();
    },
    [push]
  );

  const setStatus = useCallback(
    (id: string, statut: StatusKey) => {
      dispatch({ type: 'UPDATE_CONVERT', id, patch: { statut } });
      push({ id: uuid(), kind: 'convert.update', convertId: id, body: { status: statut } });
    },
    [push]
  );

  const planVisit = useCallback(
    async (id: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (!c) return;

      await cancelReminder(c.reminderId);

      // Une visite déjà planifiée est reportée, pas effacée.
      const encours = latest.current.plannedVisits[id];
      if (encours) push({ id: uuid(), kind: 'visit.postpone', visitId: encours.visitId });

      const visitId = uuid();
      const nextVisit = isoFromOffset(DELAI_VISITE);
      const scheduledAt = new Date(`${nextVisit}T10:00:00`).toISOString();
      const history = [{ date: t.due_today, text: t.hist_planned }, ...c.history];

      const reminderId = latest.current.settings.notifOn
        ? await scheduleVisitReminder({ ...c, nextVisit }, t.notif_title)
        : null;

      dispatch({
        type: 'UPDATE_CONVERT',
        id,
        patch: { nextVisit, done: false, history, reminderId },
      });
      dispatch({ type: 'SET_PLANNED_VISIT', convertId: id, visit: { visitId, scheduledAt } });

      push({ id: uuid(), kind: 'visit.create', visitId, convertId: id, scheduledAt });
    },
    [push, t]
  );

  /**
   * Cocher la case, c'est clore la visite planifiée — pas basculer un
   * drapeau. La décocher replanifie, ce qui est la seule lecture honnête :
   * on ne « dé-visite » pas quelqu'un.
   */
  const toggleTask = useCallback(
    (id: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (!c) return;

      if (c.done) {
        void planVisit(id);
        return;
      }

      void cancelReminder(c.reminderId);
      dispatch({
        type: 'UPDATE_CONVERT',
        id,
        patch: {
          done: true,
          nextVisit: null,
          reminderId: null,
          history: [{ date: t.due_today, text: t.hist_visit_done }, ...c.history],
        },
      });

      const encours = latest.current.plannedVisits[id];
      dispatch({ type: 'SET_PLANNED_VISIT', convertId: id, visit: null });

      if (encours) push({ id: uuid(), kind: 'visit.complete', visitId: encours.visitId });
    },
    [planVisit, push, t]
  );

  /**
   * Le fil d'activité complet, à l'ouverture d'une fiche. Il n'est pas
   * chargé avec la liste : cinquante entrées par dossier multipliées par
   * tous les dossiers, pour un écran qui n'en montre qu'un.
   */
  const loadConvertHistory = useCallback(
    async (id: string) => {
      try {
        const { events } = await api.showConvert(id);
        dispatch({
          type: 'UPDATE_CONVERT',
          id,
          patch: { history: historyFromEvents(events, t, latest.current.lang) },
        });
      } catch {
        // Hors ligne : on garde le fil déjà en cache.
      }
    },
    [t]
  );

  /* ---------------------------------------------------------------- *
   * Secteurs
   * ---------------------------------------------------------------- */

  const addSector = useCallback(
    (name: string, ville: string, pays: string) => {
      const id = uuid();
      const sector: Sector = {
        id,
        name: name.trim(),
        ville: ville.trim() || '—',
        pays: pays.trim() || '—',
      };

      dispatch({ type: 'ADD_SECTOR', sector });
      push({
        id: uuid(),
        kind: 'sector.create',
        sectorId: id,
        body: { name: sector.name, city: ville.trim() || null, country: pays.trim() || null },
      });
    },
    [push]
  );

  const updateSector = useCallback(
    (id: string, name: string, ville: string, pays: string) => {
      const patch = { name: name.trim(), ville: ville.trim() || '—', pays: pays.trim() || '—' };
      const ancien = latest.current.sectors.find((s) => s.id === id);

      dispatch({ type: 'UPDATE_SECTOR', id, patch });

      /**
       * Les convertis désignent leur secteur par son nom côté interface.
       * Renommer un secteur doit donc suivre dans les fiches, sinon elles
       * pointeraient vers un nom qui n'existe plus.
       */
      if (ancien && ancien.name !== patch.name) {
        for (const c of latest.current.converts) {
          if (c.secteur === ancien.name) {
            dispatch({ type: 'UPDATE_CONVERT', id: c.id, patch: { secteur: patch.name } });
          }
        }
      }

      push({
        id: uuid(),
        kind: 'sector.update',
        sectorId: id,
        body: { name: patch.name, city: ville.trim() || null, country: pays.trim() || null },
      });
    },
    [push]
  );

  const deleteSector = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_SECTOR', id });

      void (async () => {
        const oublie = await forgetLocalSector(id);
        if (oublie) {
          dispatch({ type: 'SYNC', pending: pendingCount(), offline: false, rejected: false });
          return;
        }
        push({ id: uuid(), kind: 'sector.delete', sectorId: id });
      })();
    },
    [push]
  );

  /* ---------------------------------------------------------------- *
   * Notifications — locales à l'appareil
   * ---------------------------------------------------------------- */

  const markNotifRead = useCallback(
    (id: string) =>
      dispatch({
        type: 'SET_NOTIFICATIONS',
        notifications: latest.current.notifications.map((n) =>
          n.id === id ? { ...n, unread: false } : n
        ),
      }),
    []
  );

  const markAllRead = useCallback(
    () =>
      dispatch({
        type: 'SET_NOTIFICATIONS',
        notifications: latest.current.notifications.map((n) => ({ ...n, unread: false })),
      }),
    []
  );

  const clearNotifications = useCallback(
    () => dispatch({ type: 'SET_NOTIFICATIONS', notifications: [] }),
    []
  );

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => n.unread).length,
    [state.notifications]
  );

  /**
   * Le profil serveur, présenté sous la forme attendue par les écrans. La
   * photo n'en fait pas partie : elle reste sur l'appareil, faute d'un
   * stockage de fichiers — et c'est un manque assumé, pas un oubli.
   */
  const currentUser = useMemo<Evangelist | null>(() => {
    if (!state.user) return null;
    return {
      id: String(state.user.id),
      name: state.user.fullName ?? state.user.email,
      email: state.user.email,
      church: state.user.church ?? '',
      photoUri: state.photoUri,
    };
  }, [state.user, state.photoUri]);

  const value: AppContextValue = {
    hydrated: state.hydrated,
    introSeen: state.introSeen,
    lang: state.lang,
    t,
    currentUser,
    isAuthenticated: state.user != null,
    converts: state.converts,
    sectors: state.sectors,
    notifications: state.notifications,
    settings: state.settings,
    unreadCount,
    pending: state.pending,
    offline: state.offline,
    rejected: state.rejected,
    syncNow,
    loadConvertHistory,
    markIntroSeen,
    login,
    register,
    logout,
    updateProfile,
    setLang,
    toggleNotif,
    setAppLock,
    setThemePref,
    addConvert,
    updateConvert,
    deleteConvert,
    setStatus,
    planVisit,
    toggleTask,
    addSector,
    updateSector,
    deleteSector,
    markNotifRead,
    markAllRead,
    clearNotifications,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
