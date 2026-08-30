import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { LockGate } from '@/components/LockGate';
import { AppProvider, useApp } from '@/context/AppContext';
import { ThemeProvider, useColors, useScheme } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function RootNavigator() {
  const { hydrated, isAuthenticated, introSeen } = useApp();
  const colors = useColors();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const first = segments[0] as string | undefined;
    const inAuthFlow = first === 'login' || first === 'register' || first === 'onboarding';
    if (!isAuthenticated && !inAuthFlow) {
      router.replace(introSeen ? '/login' : '/onboarding');
    } else if (isAuthenticated && inAuthFlow) {
      router.replace('/');
    }
  }, [hydrated, isAuthenticated, introSeen, segments, router]);

  if (!hydrated) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="convert/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="sectors" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

function ThemedShell() {
  const scheme = useScheme();
  return (
    <>
      <ToastProvider>
        <LockGate>
          <RootNavigator />
        </LockGate>
      </ToastProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <ThemeProvider>
            <ThemedShell />
          </ThemeProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
