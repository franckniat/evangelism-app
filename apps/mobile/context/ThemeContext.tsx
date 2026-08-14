import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

type Scheme = 'light' | 'dark';

type ThemeValue = { colors: AppColors; scheme: Scheme };

const ThemeContext = createContext<ThemeValue>({ colors: lightColors, scheme: 'light' });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  const system = useColorScheme();
  const pref = settings.themePref;

  const scheme: Scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;

  const value = useMemo<ThemeValue>(
    () => ({ colors: scheme === 'dark' ? darkColors : lightColors, scheme }),
    [scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Couleurs du thème actif (clair ou sombre). */
export function useColors(): AppColors {
  return useContext(ThemeContext).colors;
}

/** Schéma actif résolu ('light' | 'dark'). */
export function useScheme(): Scheme {
  return useContext(ThemeContext).scheme;
}
