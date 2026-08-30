/**
 * Moisson — système de design (style minimaliste type shadcn/ui).
 * Police Bricolage Grotesque, bleu comme couleur principale, jetons
 * sémantiques déclinés
 * en thème clair et sombre.
 */

export type AppColors = {
  bg: string;
  surface: string;
  muted: string;
  text: string;
  mutedText: string;
  divider: string;

  accent: string;
  onAccent: string;
  accentSoft: string;
  accentStrong: string;
  accentMid: string;

  iconMuted: string;
  pressed: string;
  track: string;
  dotInactive: string;

  avatarBg: string;
  avatarFg: string;

  notifIconBg: string;
  notifIconFg: string;

  tagNeutralBg: string;
  tagNeutralFg: string;

  danger: string;
  dangerBorder: string;

  overlay: string;
  invBg: string;
  invText: string;
};

export const lightColors: AppColors = {
  bg: '#ffffff',
  surface: '#ffffff',
  muted: '#f4f4f5',
  text: '#09090b',
  mutedText: '#71717a',
  divider: '#e4e4e7',

  accent: '#2563eb',
  onAccent: '#ffffff',
  accentSoft: '#dbeafe',
  accentStrong: '#1d4ed8',
  accentMid: '#3b82f6',

  iconMuted: '#71717a',
  pressed: '#f4f4f5',
  track: '#e4e4e7',
  dotInactive: '#d4d4d8',

  avatarBg: '#18181b',
  avatarFg: '#ffffff',

  notifIconBg: '#e4e4e7',
  notifIconFg: '#3f3f46',

  tagNeutralBg: '#f4f4f5',
  tagNeutralFg: '#3f3f46',

  danger: '#dc2626',
  dangerBorder: '#fecaca',

  overlay: 'rgba(9,9,11,0.4)',
  invBg: '#18181b',
  invText: '#ffffff',
};

export const darkColors: AppColors = {
  bg: '#09090b',
  surface: '#18181b',
  muted: '#27272a',
  text: '#fafafa',
  mutedText: '#a1a1aa',
  divider: '#27272a',

  accent: '#3b82f6',
  onAccent: '#ffffff',
  accentSoft: 'rgba(59,130,246,0.16)',
  accentStrong: '#93c5fd',
  accentMid: '#60a5fa',

  iconMuted: '#a1a1aa',
  pressed: '#27272a',
  track: '#3f3f46',
  dotInactive: '#52525b',

  avatarBg: '#3f3f46',
  avatarFg: '#fafafa',

  notifIconBg: '#27272a',
  notifIconFg: '#a1a1aa',

  tagNeutralBg: '#27272a',
  tagNeutralFg: '#d4d4d8',

  danger: '#f87171',
  dangerBorder: 'rgba(248,113,113,0.4)',

  overlay: 'rgba(0,0,0,0.6)',
  invBg: '#fafafa',
  invText: '#09090b',
};

/** Palette par défaut (thème clair) — pour tout usage hors composant. */
export const palette = lightColors;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

/**
 * Familles de police Bricolage Grotesque
 * (`@expo-google-fonts/bricolage-grotesque` sur mobile, `next/font` sur le
 * web). Les noms sont ceux des graisses chargées : sur React Native une
 * police se désigne par sa fonte, pas par une famille plus un poids.
 */
export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  semibold: 'BricolageGrotesque_600SemiBold',
  heading: 'BricolageGrotesque_700Bold',
} as const;
