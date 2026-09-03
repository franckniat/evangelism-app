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

    /**
     * `addContactAsync` attend encore la forme « legacy » d'un contact, que
     * `Contacts.Contact` ne désigne plus depuis le SDK 57 (c'est désormais la
     * classe du nouveau module). On vise donc ce que la fonction attend
     * réellement plutôt qu'un type qui a changé de sens.
     */
    const contact = {
      [Contacts.Fields.FirstName]: c.prenom,
      [Contacts.Fields.LastName]: c.nom,
      [Contacts.Fields.Note]: c.notes,
      [Contacts.Fields.PhoneNumbers]: [{ label: 'mobile', number: c.tel }],
    } as unknown as Parameters<typeof Contacts.addContactAsync>[0];

    await Contacts.addContactAsync(contact);
    return true;
  } catch {
    return false;
  }
}
