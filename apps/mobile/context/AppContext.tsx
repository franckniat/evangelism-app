/**
 * L'état de l'application — entièrement local.
 *
 * Tout vit sur l'appareil, dans le dépôt local (`lib/local-store`). Aucune
 * action ne parle à un serveur : chaque modification met l'état à jour et le
 * persiste, immédiatement. L'application fonctionne sans réseau, toujours.
 *
 * L'online se greffera plus tard, au fur et à mesure, derrière le dépôt
 * local — sans réécrire ce fichier. C'est pour cela que chaque
 * enregistrement porte un `updatedAt` : une future synchronisation saura quel
 * côté a la version la plus récente.
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
import { cancelReminder, scheduleVisitReminder } from '@/lib/notifications';
import {
  DEFAULT_SETTINGS,
  chargerEtat,
  maintenant,
  persisterConvertis,
  persisterIntroSeen,
  persisterLang,
  persisterNotifications,
  persisterProfil,
  persisterSecteurs,
  persisterSettings,
} from '@/lib/local-store';
import type {
  AppNotification,
  Convert,
  Evangelist,
  Sector,
  Settings,
  Sexe,
  ThemePref,
} from '@/lib/types';

type AppState = {
  hydrated: boolean;
  introSeen: boolean;
  profil: Evangelist | null;
  converts: Convert[];
  sectors: Sector[];
  notifications: AppNotification[];
  lang: Lang;
  settings: Settings;
  /**
   * Vrai juste après la création du profil : on propose alors de saisir ses
   * secteurs de prédication avant d'entrer dans l'application. Transitoire —
   * ne survit pas au redémarrage (le bandeau « aucun secteur » prend le
   * relais).
   */
  needsSectorSetup: boolean;
};

const initialState: AppState = {
  hydrated: false,
  introSeen: false,
  profil: null,
  converts: [],
  sectors: [],
  notifications: [],
  lang: 'fr',
  settings: DEFAULT_SETTINGS,
  needsSectorSetup: false,
};

type Action =
  | { type: 'HYDRATE'; payload: Omit<AppState, 'hydrated' | 'needsSectorSetup'> }
  | { type: 'SET_INTRO_SEEN' }
  | { type: 'SET_PROFILE'; profil: Evangelist; needsSectorSetup?: boolean }
  | { type: 'SECTOR_SETUP_DONE' }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'SET_SETTINGS'; patch: Partial<Settings> }
  | { type: 'ADD_CONVERT'; convert: Convert }
  | { type: 'UPDATE_CONVERT'; id: string; patch: Partial<Convert> }
  | { type: 'DELETE_CONVERT'; id: string }
  | { type: 'ADD_SECTOR'; sector: Sector }
  | { type: 'UPDATE_SECTOR'; id: string; patch: Partial<Sector> }
  | { type: 'DELETE_SECTOR'; id: string }
  | { type: 'SET_NOTIFICATIONS'; notifications: AppNotification[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, hydrated: true };
    case 'SET_INTRO_SEEN':
      return { ...state, introSeen: true };
    case 'SET_PROFILE':
      return {
        ...state,
        profil: action.profil,
        needsSectorSetup: action.needsSectorSetup ?? state.needsSectorSetup,
      };
    case 'SECTOR_SETUP_DONE':
      return { ...state, needsSectorSetup: false };
    case 'SET_LANG':
      return { ...state, lang: action.lang };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'ADD_CONVERT':
      return { ...state, converts: [action.convert, ...state.converts] };
    case 'UPDATE_CONVERT':
      return {
        ...state,
        converts: state.converts.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };
    case 'DELETE_CONVERT':
      return { ...state, converts: state.converts.filter((c) => c.id !== action.id) };
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

export type ProfileInput = { name: string; church: string; photoUri?: string | null };
export type ProfilePatch = { name?: string; church?: string; photoUri?: string | null };

type AppContextValue = {
  hydrated: boolean;
  introSeen: boolean;
  lang: Lang;
  t: Dict;
  currentUser: Evangelist | null;
  isAuthenticated: boolean;
  /** Vrai juste après la création du profil : la saisie des secteurs est proposée. */
  needsSectorSetup: boolean;
  converts: Convert[];
  sectors: Sector[];
  notifications: AppNotification[];
  settings: Settings;
  unreadCount: number;
  /**
   * Conservés pour compatibilité avec les écrans, mais sans objet en local :
   * il n'y a ni file d'envoi ni serveur à interroger. `syncNow` et
   * `loadConvertHistory` ne font rien ; les indicateurs restent neutres.
   */
  pending: number;
  offline: boolean;
  rejected: boolean;
  syncNow: () => Promise<void>;
  loadConvertHistory: (id: string) => Promise<void>;
  // onboarding
  markIntroSeen: () => void;
  createProfile: (input: ProfileInput) => void;
  finishSectorSetup: () => void;
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
const noop = async () => {};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, appliquer] = useReducer(reducer, initialState);

  /**
   * L'état vu par les fonctions asynchrones, tenu à jour dans le même geste
   * que l'envoi au réducteur (et non dans un effet, qui ne s'exécute qu'après
   * le rendu). Le réducteur étant pur, l'appliquer ici ne coûte rien et
   * supprime toute une famille de bogues d'état périmé.
   */
  const latest = useRef(state);
  const dispatch = useCallback((action: Action) => {
    latest.current = reducer(latest.current, action);
    appliquer(action);
  }, []);

  /* ---------------------------------------------------------------- *
   * Chargement initial et persistance
   * ---------------------------------------------------------------- */

  useEffect(() => {
    let active = true;
    (async () => {
      const etat = await chargerEtat();
      if (!active) return;
      dispatch({
        type: 'HYDRATE',
        payload: {
          introSeen: etat.introSeen,
          profil: etat.profil,
          converts: etat.convertis,
          sectors: etat.secteurs,
          notifications: etat.notifications,
          lang: etat.lang,
          settings: etat.settings,
        },
      });
    })();
    return () => {
      active = false;
    };
  }, [dispatch]);

  const { hydrated } = state;
  useEffect(() => {
    if (hydrated) void persisterIntroSeen(state.introSeen);
  }, [hydrated, state.introSeen]);
  useEffect(() => {
    if (hydrated) void persisterProfil(state.profil);
  }, [hydrated, state.profil]);
  useEffect(() => {
    if (hydrated) void persisterConvertis(state.converts);
  }, [hydrated, state.converts]);
  useEffect(() => {
    if (hydrated) void persisterSecteurs(state.sectors);
  }, [hydrated, state.sectors]);
  useEffect(() => {
    if (hydrated) void persisterNotifications(state.notifications);
  }, [hydrated, state.notifications]);
  useEffect(() => {
    if (hydrated) void persisterLang(state.lang);
  }, [hydrated, state.lang]);
  useEffect(() => {
    if (hydrated) void persisterSettings(state.settings);
  }, [hydrated, state.settings]);

  const t = DICT[state.lang];

  /* ---------------------------------------------------------------- *
   * Onboarding & profil
   * ---------------------------------------------------------------- */

  const markIntroSeen = useCallback(() => dispatch({ type: 'SET_INTRO_SEEN' }), [dispatch]);
  const finishSectorSetup = useCallback(() => dispatch({ type: 'SECTOR_SETUP_DONE' }), [dispatch]);

  const createProfile = useCallback(
    (input: ProfileInput) => {
      const profil: Evangelist = {
        id: uuid(),
        name: input.name.trim(),
        church: input.church.trim(),
        photoUri: input.photoUri ?? null,
        updatedAt: maintenant(),
      };
      // Nouveau profil : on propose la saisie des secteurs, sauf s'il y en a déjà.
      dispatch({
        type: 'SET_PROFILE',
        profil,
        needsSectorSetup: latest.current.sectors.length === 0,
      });
    },
    [dispatch]
  );

  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      const actuel = latest.current.profil;
      if (!actuel) return;
      dispatch({
        type: 'SET_PROFILE',
        profil: {
          ...actuel,
          ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
          ...(patch.church !== undefined ? { church: patch.church.trim() } : {}),
          ...(patch.photoUri !== undefined ? { photoUri: patch.photoUri } : {}),
          updatedAt: maintenant(),
        },
      });
    },
    [dispatch]
  );

  /* ---------------------------------------------------------------- *
   * Préférences
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

  /** Toute modification d'une fiche passe ici, pour que `updatedAt` suive. */
  const modifierConvert = useCallback(
    (id: string, patch: Partial<Convert>) =>
      dispatch({ type: 'UPDATE_CONVERT', id, patch: { ...patch, updatedAt: maintenant() } }),
    [dispatch]
  );

  const addConvert = useCallback(
    (input: ConvertFields, options?: { firstVisit?: string | null; consented?: boolean }) => {
      const id = uuid();

      /**
       * Pas de première visite imposée : elle n'existe que si une date a été
       * choisie au calendrier. Un dossier peut naître sans échéance — le
       * bandeau « sans visite » de l'accueil s'en charge.
       */
      const nextVisit = options?.firstVisit ?? null;

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
        consentedAt: (options?.consented ?? true) ? maintenant() : null,
        updatedAt: maintenant(),
      };

      dispatch({ type: 'ADD_CONVERT', convert });

      // Si une première visite est fixée, on programme le rappel local.
      if (nextVisit && latest.current.settings.notifOn) {
        void (async () => {
          const reminderId = await scheduleVisitReminder({ ...convert, nextVisit }, t.notif_title);
          if (reminderId) modifierConvert(id, { reminderId });
        })();
      }

      return id;
    },
    [dispatch, modifierConvert, t]
  );

  /**
   * Import en bloc depuis le répertoire du téléphone.
   *
   * Sans consentement — ces personnes n'ont pas été informées en face à face —
   * et sans visite : la planification se fera au calendrier quand
   * l'utilisateur le décidera.
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
          { consented: false }
        );
        n += 1;
      }
      return n;
    },
    [addConvert]
  );

  const updateConvert = useCallback(
    (id: string, input: ConvertFields) => {
      modifierConvert(id, {
        prenom: input.prenom.trim(),
        nom: input.nom.trim(),
        tel: input.tel.trim(),
        sexe: input.sexe,
        secteur: input.secteur,
        statut: input.statut,
        notes: input.notes.trim() || '—',
      });
    },
    [modifierConvert]
  );

  const deleteConvert = useCallback(
    (id: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (c) void cancelReminder(c.reminderId);
      dispatch({ type: 'DELETE_CONVERT', id });
    },
    [dispatch]
  );

  const setStatus = useCallback(
    (id: string, statut: StatusKey) => modifierConvert(id, { statut }),
    [modifierConvert]
  );

  /**
   * Planifie une visite à la date choisie au calendrier. Une visite déjà en
   * cours est simplement remplacée par la nouvelle.
   */
  const planVisit = useCallback(
    async (id: string, dateISO: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (!c) return;

      await cancelReminder(c.reminderId);

      const nextVisit = dateISO;
      const history = [{ date: t.due_today, text: t.hist_planned }, ...c.history];
      const reminderId = latest.current.settings.notifOn
        ? await scheduleVisitReminder({ ...c, nextVisit }, t.notif_title)
        : null;

      modifierConvert(id, { nextVisit, done: false, history, reminderId });
    },
    [modifierConvert, t]
  );

  /**
   * Cocher la case clôt la visite planifiée (et l'inscrit au fil). La
   * décocher rouvre le suivi, sans imposer de nouvelle date : c'est au
   * calendrier qu'une prochaine visite se fixe.
   */
  const toggleTask = useCallback(
    (id: string) => {
      const c = latest.current.converts.find((x) => x.id === id);
      if (!c) return;

      if (c.done) {
        modifierConvert(id, { done: false });
        return;
      }

      void cancelReminder(c.reminderId);
      modifierConvert(id, {
        done: true,
        nextVisit: null,
        reminderId: null,
        history: [{ date: t.due_today, text: t.hist_visit_done }, ...c.history],
      });
    },
    [modifierConvert, t]
  );

  /* ---------------------------------------------------------------- *
   * Secteurs
   * ---------------------------------------------------------------- */

  const addSector = useCallback(
    (name: string, ville: string, pays: string) => {
      const sector: Sector = {
        id: uuid(),
        name: name.trim(),
        ville: ville.trim() || '—',
        pays: pays.trim() || '—',
        updatedAt: maintenant(),
      };
      dispatch({ type: 'ADD_SECTOR', sector });
    },
    [dispatch]
  );

  const updateSector = useCallback(
    (id: string, name: string, ville: string, pays: string) => {
      const patch = { name: name.trim(), ville: ville.trim() || '—', pays: pays.trim() || '—' };
      const ancien = latest.current.sectors.find((s) => s.id === id);

      dispatch({ type: 'UPDATE_SECTOR', id, patch: { ...patch, updatedAt: maintenant() } });

      /**
       * Les convertis désignent leur secteur par son nom. Renommer un secteur
       * doit donc suivre dans les fiches, sinon elles pointeraient vers un nom
       * qui n'existe plus.
       */
      if (ancien && ancien.name !== patch.name) {
        for (const c of latest.current.converts) {
          if (c.secteur === ancien.name) {
            modifierConvert(c.id, { secteur: patch.name });
          }
        }
      }
    },
    [dispatch, modifierConvert]
  );

  const deleteSector = useCallback(
    (id: string) => dispatch({ type: 'DELETE_SECTOR', id }),
    [dispatch]
  );

  /* ---------------------------------------------------------------- *
   * Notifications
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

  const value: AppContextValue = {
    hydrated: state.hydrated,
    introSeen: state.introSeen,
    lang: state.lang,
    t,
    currentUser: state.profil,
    isAuthenticated: state.profil != null,
    needsSectorSetup: state.needsSectorSetup,
    converts: state.converts,
    sectors: state.sectors,
    notifications: state.notifications,
    settings: state.settings,
    unreadCount,
    pending: 0,
    offline: false,
    rejected: false,
    syncNow: noop,
    loadConvertHistory: noop,
    markIntroSeen,
    createProfile,
    finishSectorSetup,
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
