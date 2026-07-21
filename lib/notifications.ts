/**
 * Rappels de suivi via notifications locales planifiées (expo-notifications).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Convert } from '@/lib/types';

let permissionAsked = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionAsked && !current.canAskAgain) return false;
    permissionAsked = true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/**
 * Planifie un rappel à la date de `nextVisit` (10h locale). Renvoie l'id de la
 * notification (à stocker pour pouvoir l'annuler), ou null.
 */
export async function scheduleVisitReminder(c: Convert, prompt: string): Promise<string | null> {
  if (Platform.OS === 'web' || !c.nextVisit) return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const date = new Date(c.nextVisit + 'T10:00:00');
  // Si la date est déjà passée, on ne planifie rien.
  if (date.getTime() <= Date.now()) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: prompt,
        body: `${c.prenom} ${c.nom} — ${c.secteur}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | null | undefined): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignoré
  }
}
