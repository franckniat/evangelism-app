import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { DICT, type Dict, type Lang } from '@/constants/i18n';
import type { StatusKey } from '@/constants/status';
import { hashPassword } from '@/lib/auth';
import { isoFromOffset } from '@/lib/dates';
import { cancelReminder, scheduleVisitReminder } from '@/lib/notifications';
import { KEYS, loadAppState, setJSON, type PersistedState } from '@/lib/storage';
import type { Convert, Evangelist, Sector, Sexe, ThemePref } from '@/lib/types';

type AppState = PersistedState & { hydrated: boolean };

const initialState: AppState = {
  introSeen: false,
  evangelists: [],
  currentUserId: null,
  converts: [],
  sectors: [],
  notifications: [],
  lang: 'fr',
  settings: { notifOn: true, appLock: false, themePref: 'system' },
  hydrated: false,
};

type Action =
  | { type: 'HYDRATE'; payload: PersistedState }
  | { type: 'SET_INTRO_SEEN' }
  | { type: 'LOGIN'; userId: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER'; evangelist: Evangelist }
  | { type: 'UPDATE_USER'; patch: Partial<Evangelist> }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'SET_SETTINGS'; patch: Partial<AppState['settings']> }
  | { type: 'ADD_CONVERT'; convert: Convert }
  | { type: 'UPDATE_CONVERT'; id: string; patch: Partial<Convert> }
  | { type: 'DELETE_CONVERT'; id: string }
  | { type: 'ADD_SECTOR'; sector: Sector }
  | { type: 'UPDATE_SECTOR'; id: string; patch: Partial<Sector> }
  | { type: 'DELETE_SECTOR'; id: string }
  | { type: 'SET_NOTIFICATIONS'; notifications: AppState['notifications'] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, hydrated: true };
    case 'SET_INTRO_SEEN':
      return { ...state, introSeen: true };
    case 'LOGIN':
      return { ...state, currentUserId: action.userId };
    case 'LOGOUT':
      return { ...state, currentUserId: null };
    case 'REGISTER':
      return {
        ...state,
        evangelists: [...state.evangelists, action.evangelist],
        currentUserId: action.evangelist.id,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        evangelists: state.evangelists.map((e) =>
          e.id === state.currentUserId ? { ...e, ...action.patch } : e
        ),
      };
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
  sexe: Sexe;
  secteur: string;
  statut: StatusKey;
  notes: string;
};

export type RegisterInput = {
  name: string;
  church: string;
  password: string;
  email?: string;
  phone?: string;
  photoUri?: string | null;
};

export type ProfilePatch = { name?: string; church?: string; photoUri?: string | null };

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
  // onboarding
  markIntroSeen: () => void;
  // auth
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<{ ok: boolean; error?: 'identifier' }>;
  logout: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  // preferences
  setLang: (lang: Lang) => void;
  toggleNotif: () => void;
  setAppLock: (value: boolean) => void;
  setThemePref: (pref: ThemePref) => void;
  // converts
  addConvert: (input: ConvertFields) => string;
  updateConvert: (id: string, input: ConvertFields) => void;
  deleteConvert: (id: string) => void;
  setStatus: (id: string, statut: StatusKey) => void;
  planVisit: (id: string) => Promise<void>;
  toggleTask: (id: string) => void;
  // sectors
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

const norm = (s: string) => s.trim().toLowerCase().replace(/\s/g, '');

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Chargement initial
  useEffect(() => {
    let active = true;
    loadAppState().then((payload) => {
      if (active) dispatch({ type: 'HYDRATE', payload });
    });
    return () => {
      active = false;
    };
  }, []);

  // Persistance par collection (après hydratation)
  const { hydrated } = state;
  useEffect(() => {
    if (hydrated) setJSON(KEYS.introSeen, state.introSeen);
  }, [hydrated, state.introSeen]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.evangelists, state.evangelists);
  }, [hydrated, state.evangelists]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.currentUserId, state.currentUserId);
  }, [hydrated, state.currentUserId]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.converts, state.converts);
  }, [hydrated, state.converts]);
  useEffect(() => {
    if (hydrated) setJSON(KEYS.sectors, state.sectors);
  }, [hydrated, state.sectors]);
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

  const currentUser = useMemo(
    () => state.evangelists.find((e) => e.id === state.currentUserId) ?? null,
    [state.evangelists, state.currentUserId]
  );

  const markIntroSeen = useCallback(() => dispatch({ type: 'SET_INTRO_SEEN' }), []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const id = norm(identifier);
      const hash = await hashPassword(password);
      const found = state.evangelists.find(
        (e) =>
          e.passwordHash === hash &&
          ((e.email && norm(e.email) === id) || (e.phone && norm(e.phone) === id))
      );
      if (!found) return false;
      dispatch({ type: 'LOGIN', userId: found.id });
      return true;
    },
    [state.evangelists]
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<{ ok: boolean; error?: 'identifier' }> => {
      const email = input.email?.trim() || undefined;
      const phone = input.phone?.trim() || undefined;
      const emailN = email ? norm(email) : null;
      const phoneN = phone ? norm(phone) : null;
      const clash = state.evangelists.some(
        (e) =>
          (emailN && e.email && norm(e.email) === emailN) ||
          (phoneN && e.phone && norm(e.phone) === phoneN)
      );
      if (clash) return { ok: false, error: 'identifier' };

      const evangelist: Evangelist = {
        id: 'ev-' + Date.now(),
        name: input.name.trim(),
        email,
        phone,
        passwordHash: await hashPassword(input.password),
        church: input.church.trim(),
        photoUri: input.photoUri ?? null,
      };
      dispatch({ type: 'REGISTER', evangelist });
      return { ok: true };
    },
    [state.evangelists]
  );

  const logout = useCallback(() => dispatch({ type: 'LOGOUT' }), []);
  const updateProfile = useCallback(
    (patch: ProfilePatch) => dispatch({ type: 'UPDATE_USER', patch }),
    []
  );

  const setLang = useCallback((lang: Lang) => dispatch({ type: 'SET_LANG', lang }), []);
  const toggleNotif = useCallback(
    () => dispatch({ type: 'SET_SETTINGS', patch: { notifOn: !state.settings.notifOn } }),
    [state.settings.notifOn]
  );
  const setAppLock = useCallback(
    (value: boolean) => dispatch({ type: 'SET_SETTINGS', patch: { appLock: value } }),
    []
  );
  const setThemePref = useCallback(
    (pref: ThemePref) => dispatch({ type: 'SET_SETTINGS', patch: { themePref: pref } }),
    []
  );

  const addConvert = useCallback(
    (input: ConvertFields) => {
      const id = 'k' + Date.now();
      const convert: Convert = {
        id,
        prenom: input.prenom.trim(),
        nom: input.nom.trim(),
        tel: input.tel.trim(),
        sexe: input.sexe,
        secteur: input.secteur,
        statut: input.statut,
        nextVisit: isoFromOffset(3),
        done: false,
        added: t.due_today,
        notes: input.notes.trim() || '—',
        history: [{ date: t.due_today, text: t.hist_first }],
        reminderId: null,
      };
      dispatch({ type: 'ADD_CONVERT', convert });
      return id;
    },
    [t]
  );

  const updateConvert = useCallback((id: string, input: ConvertFields) => {
    dispatch({
      type: 'UPDATE_CONVERT',
      id,
      patch: {
        prenom: input.prenom.trim(),
        nom: input.nom.trim(),
        tel: input.tel.trim(),
        sexe: input.sexe,
        secteur: input.secteur,
        statut: input.statut,
        notes: input.notes.trim() || '—',
      },
    });
  }, []);

  const deleteConvert = useCallback(
    (id: string) => {
      const c = state.converts.find((x) => x.id === id);
      if (c) cancelReminder(c.reminderId);
      dispatch({ type: 'DELETE_CONVERT', id });
    },
    [state.converts]
  );

  const setStatus = useCallback(
    (id: string, statut: StatusKey) => dispatch({ type: 'UPDATE_CONVERT', id, patch: { statut } }),
    []
  );

  const planVisit = useCallback(
    async (id: string) => {
      const c = state.converts.find((x) => x.id === id);
      if (!c) return;
      await cancelReminder(c.reminderId);
      const nextVisit = isoFromOffset(3);
      const updated: Convert = {
        ...c,
        nextVisit,
        done: false,
        history: [{ date: t.due_today, text: t.hist_planned }, ...c.history],
      };
      const reminderId = state.settings.notifOn
        ? await scheduleVisitReminder(updated, t.notif_title)
        : null;
      dispatch({
        type: 'UPDATE_CONVERT',
        id,
        patch: { nextVisit, done: false, history: updated.history, reminderId },
      });
    },
    [state.converts, state.settings.notifOn, t]
  );

  const toggleTask = useCallback(
    (id: string) => {
      const c = state.converts.find((x) => x.id === id);
      if (!c) return;
      const nowDone = !c.done;
      if (nowDone) cancelReminder(c.reminderId);
      dispatch({
        type: 'UPDATE_CONVERT',
        id,
        patch: { done: nowDone, reminderId: nowDone ? null : c.reminderId },
      });
    },
    [state.converts]
  );

  const addSector = useCallback((name: string, ville: string, pays: string) => {
    const sector: Sector = {
      id: 's' + Date.now(),
      name: name.trim(),
      ville: ville.trim() || '—',
      pays: pays.trim() || '—',
    };
    dispatch({ type: 'ADD_SECTOR', sector });
  }, []);

  const updateSector = useCallback((id: string, name: string, ville: string, pays: string) => {
    dispatch({
      type: 'UPDATE_SECTOR',
      id,
      patch: { name: name.trim(), ville: ville.trim() || '—', pays: pays.trim() || '—' },
    });
  }, []);

  const deleteSector = useCallback((id: string) => dispatch({ type: 'DELETE_SECTOR', id }), []);

  const markNotifRead = useCallback(
    (id: string) =>
      dispatch({
        type: 'SET_NOTIFICATIONS',
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      }),
    [state.notifications]
  );

  const markAllRead = useCallback(
    () =>
      dispatch({
        type: 'SET_NOTIFICATIONS',
        notifications: state.notifications.map((n) => ({ ...n, unread: false })),
      }),
    [state.notifications]
  );

  const clearNotifications = useCallback(
    () => dispatch({ type: 'SET_NOTIFICATIONS', notifications: [] }),
    []
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
    currentUser,
    isAuthenticated: state.currentUserId != null,
    converts: state.converts,
    sectors: state.sectors,
    notifications: state.notifications,
    settings: state.settings,
    unreadCount,
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
