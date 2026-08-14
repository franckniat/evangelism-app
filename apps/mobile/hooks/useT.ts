import type { Dict } from '@/constants/i18n';
import { useApp } from '@/context/AppContext';

/** Raccourci vers le dictionnaire de la langue courante. */
export function useT(): Dict {
  return useApp().t;
}
