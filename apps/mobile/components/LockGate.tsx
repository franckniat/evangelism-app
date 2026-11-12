import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, type AppStateStatus } from 'react-native';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';
import { authenticate } from '@/lib/lock';

/**
 * Verrouille le contenu tant que l'utilisateur n'est pas authentifié
 * (biométrie / code de l'appareil). Se re-verrouille au retour au premier plan.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const { hydrated, isAuthenticated, settings, t } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const lockEnabled = isAuthenticated && settings.appLock;

  const [unlocked, setUnlocked] = useState(false);
  const prompting = useRef(false);
  const appState = useRef(AppState.currentState);

  /**
   * Activer le verrou impose de se déverrouiller. Ajusté pendant le rendu, et
   * non dans un effet : un effet laisserait les dossiers visibles le temps
   * d'un affichage, le temps de s'exécuter.
   */
  const [previousLockEnabled, setPreviousLockEnabled] = useState(lockEnabled);
  if (lockEnabled !== previousLockEnabled) {
    setPreviousLockEnabled(lockEnabled);
    setUnlocked(false);
  }

  const locked = hydrated && lockEnabled && !unlocked;

  const tryUnlock = useCallback(() => {
    if (prompting.current) return;
    prompting.current = true;
    void authenticate(t.lock_prompt).then((ok) => {
      prompting.current = false;
      if (ok) setUnlocked(true);
    });
  }, [t.lock_prompt]);

  useEffect(() => {
    if (locked) tryUnlock();
  }, [locked, tryUnlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev?.match(/inactive|background/) && next === 'active' && lockEnabled) {
        setUnlocked(false);
      }
    });
    return () => sub.remove();
  }, [lockEnabled]);

  return (
    <View style={styles.root}>
      {children}
      {locked && (
        <View style={styles.overlay}>
          <View style={styles.iconWrap}>
            <Feather name="lock" size={34} color={c.onAccent} />
          </View>
          <Text style={styles.title}>{t.lock_title}</Text>
          <Text style={styles.sub}>{t.lock_sub}</Text>
          <Pressable style={styles.btn} onPress={tryUnlock}>
            <Feather name="unlock" size={17} color={c.onAccent} />
            <Text style={styles.btnText}>{t.lock_unlock}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: { flex: 1 },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 10,
      zIndex: 1000,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: { fontFamily: fonts.heading, fontSize: 22, color: c.text },
    sub: { fontFamily: fonts.regular, fontSize: 13, color: c.mutedText, marginBottom: 14 },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.accent,
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: radius.md,
    },
    btnText: { fontFamily: fonts.heading, fontSize: 14, color: c.onAccent },
  });
