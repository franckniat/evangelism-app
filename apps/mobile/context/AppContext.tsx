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
import { aDesDonneesLocales, reprendreDonneesLocales } from '@/lib/migration';
import { cancelReminder, scheduleVisitReminder } from '@/lib/notifications';
import {
  clearOutbox,
  drain,
  enqueue,
  forgetLocalConvert,
  forgetLocalSector,
  idsEnAttente,
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
  /**
   * Vrai juste après une inscription : on propose alors de saisir ses
   * secteurs de prédication avant d'entrer dans l'application. Transitoire —
   * une connexion existante n'y passe pas, et l'état ne survit pas au
   * redémarrage (le bandeau « aucun secteur » prend le relais).
   */
  needsSectorSetup: boolean;
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
  needsSectorSetup: false,
};

type Action =
  | { type: 'HYDRATE'; payload: PersistedState; pending: number }
  | { type: 'SET_INTRO_SEEN' }
  | { type: 'SIGNED_IN'; user: UserDto; needsSectorSetup: boolean }
  | { type: 'SECTOR_SETUP_DONE' }
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
      return { ...state, user: action.user, needsSectorSetup: action.needsSectorSetup };
    case 'SECTOR_SETUP_DONE':
      return { ...state, needsSectorSetup: false };
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
  /** Peut rester inconnu : un contact importé n'a pas de sexe renseigné. */
  sexe: Sexe | null;
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
  /** Vrai juste après une inscription : la saisie des secteurs est proposée. */
  needsSectorSetup: boolean;
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
  finishSectorSetup: () => void;
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
  addConvert: (
    input: ConvertFields,
    options?: { firstVisit?: string | null; consented?: boolean }
  ) => string;
  importConverts: (entrees: { prenom: string; nom: string; tel: string }[]) => number;
  updateConvert: (id: string, input: ConvertFields) => void;
  deleteConvert: (id: string) => void;
  setStatus: (id: string, statut: StatusKey) => void;
  planVisit: (id: string, dateISO: string) => Promise<void>;
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

const uuid = () => Crypto.randomUUID();

/** Une erreur de saisie renvoyée par le serveur, pas une panne. */
function statusOf(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, appliquer] = useReducer(reducer, initialState);

  /**
   * L'état vu par les fonctions asynchrones.
   *
   * Un `useCallback` capture l'état de son rendu ; entre le moment où
   * l'utilisateur appuie et celui où la requête part, l'état a pu changer.
   * Cette référence donne toujours la version courante.
   *
   * Elle est mise à jour **dans le même geste** que l'envoi au réducteur, et
   * non dans un effet : un effet ne s'exécute qu'après le rendu, si bien
   * qu'une fonction lancée juste après un `dispatch` lirait l'état
   * d'avant. Le réducteur étant pur, l'appliquer ici et là ne coûte rien
   * et supprime toute une famille de bogues d'état périmé.
   */
  const latest = useRef(state);

  const dispatch = useCallback((action: Action) => {
    latest.current = reducer(latest.current, action);
    appliquer(action);
  }, []);

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
  }, [dispatch]);

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

    /**
     * Ce que le serveur ignore encore reste à l'écran.
     *
     * Un rafraîchissement remplace l'état local par celui du serveur. Une
     * saisie faite pendant qu'une lecture était en vol n'y figure pas encore :
     * la remplacer purement et simplement la ferait disparaître sous les yeux
     * de l'utilisateur, alors qu'elle est bien dans la file d'envoi. Il la
     * ressaisirait — et se retrouverait avec un doublon à la reconnexion.
     */
    const enAttente = idsEnAttente();
    const recuSecteurs = new Set(sectorDtos.map((s) => s.id));
    const recuConvertis = new Set(convertDtos.map((c) => c.id));

    const noms = new Map(sectorDtos.map((s) => [s.id, s.name]));
    const connus = new Map(latest.current.converts.map((c) => [c.id, c]));

    const secteursLocaux = latest.current.sectors.filter(
      (s) => enAttente.secteurs.has(s.id) && !recuSecteurs.has(s.id)
    );
    const dossiersLocaux = latest.current.converts.filter(
      (c) => enAttente.convertis.has(c.id) && !recuConvertis.has(c.id)
    );

    for (const s of secteursLocaux) noms.set(s.id, s.name);

    const sectors = [...sectorDtos.map(sectorFromDto), ...secteursLocaux].sort((a, b) =>
      a.name.localeCompare(b.name, 'fr')
    );

    const converts = [
      ...dossiersLocaux,
      ...convertDtos.map((dto) =>
        convertFromDto(dto, noms, latest.current.lang, connus.get(dto.id))
      ),
    ];

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
  }, [dispatch]);

  const executerSync = useCallback(async () => {
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
  }, [dispatch, pull]);

  /**
   * Les synchronisations s'enchaînent, elles ne se chevauchent jamais.
   *
   * Sans cela, deux lectures partent en parallèle et c'est la dernière
   * *arrivée* qui gagne — pas la dernière partie. Une lecture lancée avant
   * une saisie peut donc revenir après elle et écraser l'écran avec un
   * état antérieur. C'est exactement le bogue du secteur qu'il fallait
   * recharger pour voir.
   */
  const fileDeSync = useRef<Promise<void>>(Promise.resolve());

  const syncNow = useCallback(() => {
    const suivante = fileDeSync.current.then(executerSync, executerSync);
    fileDeSync.current = suivante.catch(() => undefined);
    return suivante;
  }, [executerSync]);

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
    [dispatch, syncNow]
  );

  /* ---------------------------------------------------------------- *
   * Authentification
   * ---------------------------------------------------------------- */

  const markIntroSeen = useCallback(() => dispatch({ type: 'SET_INTRO_SEEN' }), [dispatch]);
  const finishSectorSetup = useCallback(() => dispatch({ type: 'SECTOR_SETUP_DONE' }), [dispatch]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const auth = await api.login(email.trim().toLowerCase(), password);
        // Un compte existant ne repasse pas par la saisie des secteurs.
        dispatch({ type: 'SIGNED_IN', user: auth.user, needsSectorSetup: false });
        return { ok: true };
      } catch (error) {
        if (error instanceof OfflineError) return { ok: false, error: 'offline' };
        const status = statusOf(error);
        if (status === 429) return { ok: false, error: 'throttled' };
        return { ok: false, error: 'credentials' };
      }
    },
    [dispatch]
  );

  const register = useCallback(async (input: RegisterInput): Promise<AuthResult> => {
    try {
      const auth = await api.signup({
        fullName: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        church: input.church.trim() || null,
      });

      // Nouveau compte : on propose la saisie des secteurs avant l'accueil.
      dispatch({ type: 'SIGNED_IN', user: auth.user, needsSectorSetup: true });
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
  }, [dispatch]);

  const logout = useCallback(() => {
    void (async () => {
      for (const c of latest.current.converts) await cancelReminder(c.reminderId);
      await api.logout();
      await clearOutbox();
      await clearAccountCache();
      dispatch({ type: 'SIGNED_OUT' });
    })();
  }, [dispatch]);

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
    [dispatch, push]
  );

  /* ---------------------------------------------------------------- *
   * Préférences — locales à l'appareil, jamais envoyées
   * ---------------------------------------------------------------- */

  const setLang = useCallback((lang: Lang) => dispatch({ type: 'SET_LANG', lang }), [dispatch]);
  const toggleNotif = useCallback(
    () => dispatch({ type: 'SET_SETTINGS', patch: { notifOn: !latest.current.settings.notifOn } }),
    [dispatch]
  );
  const setAppLock = useCallback(
    (value: boolean) => dispatch({ type: 'SET_SETTINGS', patch: { appLock: value } }),
    [dispatch]
  );
  const setThemePref = useCallback(
    (pref: ThemePref) => dispatch({ type: 'SET_SETTINGS', patch: { themePref: pref } }),
    [dispatch]
  );

  /* ---------------------------------------------------------------- *
   * Convertis
   * ---------------------------------------------------------------- */

  const sectorIds = useCallback(
    () => new Map(latest.current.sectors.map((s) => [s.name, s.id])),
    []
  );

  const addConvert = useCallback(
    (input: ConvertFields, options?: { firstVisit?: string | null; consented?: boolean }) => {
      const id = uuid();

      /**
       * Plus de première visite imposée : elle n'existe que si une date a
       * été choisie au calendrier. Un dossier peut donc naître sans échéance
       * — le bandeau « sans visite » de l'accueil s'en charge.
       */
      const firstVisit = options?.firstVisit ?? null;
      const nextVisit = firstVisit;

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

      /**
       * Le consentement est transmis à la création et à elle seule : c'est
       * là qu'il a été recueilli, sur le terrain, en informant la personne.
       * Les contacts importés du téléphone, eux, arrivent sans consentement.
       */
      push({
        id: uuid(),
        kind: 'convert.create',
        convertId: id,
        body: { ...payloadFromConvert(convert, sectorIds()), consented: options?.consented ?? true },
      });

      if (firstVisit) {
        const visitId = uuid();
        const scheduledAt = new Date(`${firstVisit}T10:00:00`).toISOString();
        dispatch({ type: 'SET_PLANNED_VISIT', convertId: id, visit: { visitId, scheduledAt } });
        push({ id: uuid(), kind: 'visit.create', visitId, convertId: id, scheduledAt });
      }

      return id;
    },
    [dispatch, push, sectorIds, t]
  );

  /**
   * Import en bloc depuis le répertoire du téléphone.
   *
   * Sans consentement — ces personnes n'ont pas été informées en face à
   * face — et sans visite : le bandeau de la fiche signalera le
   * consentement manquant, et l'utilisateur planifiera au calendrier quand
   * il le décidera.
   */
  const importConverts = useCallback(
    (entrees: { prenom: string; nom: string; tel: string }[]) => {
      let n = 0;
      for (const e of entrees) {
        if (!e.prenom.trim() || !e.tel.trim()) continue;
        addConvert(
          {
            prenom: e.prenom,
            nom: e.nom,
            tel: e.tel,
            sexe: null,
            secteur: '',
            statut: 'reflexion',
            notes: '',
          },
          { consented: false },
        );
        n += 1;
      }
      return n;
    },
    [addConvert]
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
    [dispatch, push, sectorIds]
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
    [dispatch, push]
  );

  const setStatus = useCallback(
    (id: string, statut: StatusKey) => {
      dispatch({ type: 'UPDATE_CONVERT', id, patch: { statut } });
      push({ id: uuid(), kind: 'convert.update', convertId: id, body: { status: statut } });
    },
    [dispatch, push]
  );

  /**
   * Planifie une visite à la date choisie au calendrier — plus d'échéance
   * imposée à trois jours. Une visite déjà en cours est reportée.
   */
  const planVisit = useCallback(
    async (id: string, dateISO: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (!c) return;

      await cancelReminder(c.reminderId);

      const encours = latest.current.plannedVisits[id];
      if (encours) push({ id: uuid(), kind: 'visit.postpone', visitId: encours.visitId });

      const visitId = uuid();
      const nextVisit = dateISO;
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
    [dispatch, push, t]
  );

  /**
   * Cocher la case clôt la visite planifiée. La décocher rouvre simplement
   * le suivi, sans imposer de nouvelle date : c'est au calendrier, quand
   * l'utilisateur le décide, qu'une prochaine visite se fixe.
   */
  const toggleTask = useCallback(
    (id: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (!c) return;

      if (c.done) {
        dispatch({ type: 'UPDATE_CONVERT', id, patch: { done: false } });
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
    [dispatch, push, t]
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
    [dispatch, t]
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
    [dispatch, push]
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
    [dispatch, push]
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
    [dispatch, push]
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
    [dispatch]
  );

  const markAllRead = useCallback(
    () =>
      dispatch({
        type: 'SET_NOTIFICATIONS',
        notifications: latest.current.notifications.map((n) => ({ ...n, unread: false })),
      }),
    [dispatch]
  );

  const clearNotifications = useCallback(
    () => dispatch({ type: 'SET_NOTIFICATIONS', notifications: [] }),
    [dispatch]
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
    needsSectorSetup: state.needsSectorSetup,
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
    finishSectorSetup,
    login,
    register,
    logout,
    updateProfile,
    setLang,
    toggleNotif,
    setAppLock,
    setThemePref,
    addConvert,
    importConverts,
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
