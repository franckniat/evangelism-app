/**
 * Calcul des échéances de visite à partir de la date ISO `nextVisit`,
 * reprenant `taskState` / `dueLabel` / `dueColor` du prototype.
 */
import type { AppColors } from './theme';
import type { Dict } from './i18n';
import type { Convert } from './types';

export type TaskState = 'todo' | 'late' | 'done';

/** Date locale au format YYYY-MM-DD (sans décalage UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Renvoie une date ISO (YYYY-MM-DD) à `days` jours d'aujourd'hui, ou null. */
export function isoFromOffset(days: number | null): string | null {
  if (days == null) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Nombre de jours entre aujourd'hui et `iso` (négatif = passé). */
export function offsetDays(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function taskState(c: Convert): TaskState {
  if (c.done) return 'done';
  const off = offsetDays(c.nextVisit);
  if (off != null && off < 0) return 'late';
  return 'todo';
}

export function dueLabel(c: Convert, t: Dict): string {
  if (c.done) return t.due_done;
  const off = offsetDays(c.nextVisit);
  if (off == null) return '—';
  if (off < 0) return `${t.due_late} ${-off} ${t.due_days}`;
  if (off === 0) return t.due_today;
  return `${t.due_in} ${off} ${t.due_days}`;
}

export function dueColor(c: Convert, colors: AppColors): string {
  const state = taskState(c);
  const off = offsetDays(c.nextVisit);
  if (state === 'late') return colors.accentStrong;
  if (state === 'todo' && off === 0) return colors.accent;
  if (state === 'done') return colors.mutedText;
  return colors.iconMuted;
}
