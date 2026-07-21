import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

type ToastContextValue = { showToast: (msg: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [msg, setMsg] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string) => {
      setMsg(message);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) setMsg(null);
          }
        );
      }, 2200);
    },
    [opacity]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {msg != null && (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
          <View style={styles.toast}>
            <Feather name="check" size={16} color={c.accentMid} />
            <Text style={styles.text}>{msg}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 96,
      alignItems: 'center',
      zIndex: 100,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      maxWidth: '84%',
      backgroundColor: c.invBg,
      borderRadius: radius.md,
      paddingVertical: 11,
      paddingHorizontal: 18,
    },
    text: {
      color: c.invText,
      fontSize: 13,
      fontFamily: fonts.semibold,
    },
  });
