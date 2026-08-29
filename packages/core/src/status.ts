/**
 * Statuts des convertis. Les libellés sont statiques ; les couleurs sont
 * dérivées du thème actif via `statusStyle`.
 */
import type { AppColors } from './theme.js';

export type StatusKey = 'baptise' | 'sauve' | 'reflexion' | 'sceptique' | 'nonsauve';

export const STATUS_LABEL: Record<StatusKey, { fr: string; en: string }> = {
  baptise: { fr: 'Baptisé', en: 'Baptized' },
  sauve: { fr: 'Sauvé', en: 'Saved' },
  reflexion: { fr: 'En réflexion', en: 'Considering' },
  sceptique: { fr: 'Sceptique', en: 'Skeptical' },
  nonsauve: { fr: 'Non sauvé', en: 'Not saved' },
};

export const STATUS_ORDER: StatusKey[] = ['sauve', 'nonsauve', 'sceptique', 'reflexion', 'baptise'];

export type StatusStyle = {
  dot: string;
  tagBg: string;
  tagFg: string;
  tagBorder?: string;
};

export function statusStyle(c: AppColors, key: StatusKey): StatusStyle {
  switch (key) {
    case 'baptise':
      return { dot: c.accentStrong, tagBg: c.accentSoft, tagFg: c.accentStrong };
    case 'sauve':
      return { dot: c.accentMid, tagBg: c.accentSoft, tagFg: c.accentStrong };
    case 'reflexion':
      return { dot: c.mutedText, tagBg: c.tagNeutralBg, tagFg: c.tagNeutralFg };
    case 'sceptique':
      return { dot: c.text, tagBg: 'transparent', tagFg: c.accent, tagBorder: c.accent };
    case 'nonsauve':
      return { dot: c.dotInactive, tagBg: c.tagNeutralBg, tagFg: c.tagNeutralFg };
  }
}
