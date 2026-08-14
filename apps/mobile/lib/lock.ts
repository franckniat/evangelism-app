/**
 * Verrouillage de l'application via biométrie / code de l'appareil
 * (expo-local-authentication).
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** L'appareil peut-il verrouiller (biométrie ou code configuré) ? */
export async function canUseAppLock(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Lance l'authentification. Renvoie true si déverrouillé. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      // laisse le secours au code de l'appareil (pas de disableDeviceFallback)
    });
    return res.success;
  } catch {
    return false;
  }
}
