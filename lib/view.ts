/**
 * Décoration d'un converti en modèle d'affichage (initiales, libellés, statut).
 */
import type { Dict, Lang } from '@/constants/i18n';
import { statusStyle, STATUS_LABEL } from '@/constants/status';
import type { AppColors } from '@/constants/theme';
import { dueColor, dueLabel, taskState, type TaskState } from '@/lib/dates';
import type { Convert } from '@/lib/types';

export function initials(c: Pick<Convert, 'prenom' | 'nom'>): string {
  return ((c.prenom[0] || '') + (c.nom[0] || '')).toUpperCase();
}

export function fullName(c: Pick<Convert, 'prenom' | 'nom'>): string {
  return `${c.prenom} ${c.nom}`.trim();
}

export type ConvertView = Convert & {
  initials: string;
  fullName: string;
  statutLabel: string;
  statusDot: string;
  statusTagBg: string;
  statusTagFg: string;
  statusTagBorder?: string;
  sexeLabel: string;
  dueLabelText: string;
  dueColorVal: string;
  state: TaskState;
};

export function decorateConvert(c: Convert, lang: Lang, t: Dict, colors: AppColors): ConvertView {
  const st = statusStyle(colors, c.statut);
  return {
    ...c,
    initials: initials(c),
    fullName: fullName(c),
    statutLabel: STATUS_LABEL[c.statut][lang],
    statusDot: st.dot,
    statusTagBg: st.tagBg,
    statusTagFg: st.tagFg,
    statusTagBorder: st.tagBorder,
    sexeLabel: c.sexe === 'H' ? t.sexe_h : t.sexe_f,
    dueLabelText: dueLabel(c, t),
    dueColorVal: dueColor(c, colors),
    state: taskState(c),
  };
}
