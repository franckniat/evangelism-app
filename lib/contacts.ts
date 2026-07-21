/**
 * Enregistrement d'un converti dans le répertoire du téléphone (expo-contacts).
 * Remplace le téléchargement de fichier .vcf du prototype web.
 */
import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';

import type { Convert } from '@/lib/types';

/** Écrit le converti dans les contacts. Renvoie true si réussi. */
export async function saveToPhone(c: Convert): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return false;

    await Contacts.addContactAsync({
      [Contacts.Fields.FirstName]: c.prenom,
      [Contacts.Fields.LastName]: c.nom,
      [Contacts.Fields.Note]: c.notes,
      [Contacts.Fields.PhoneNumbers]: [
        { label: 'mobile', number: c.tel },
      ],
    } as Contacts.Contact);
    return true;
  } catch {
    return false;
  }
}
