/**
 * Écriture, partage et lecture du fichier de sauvegarde.
 *
 * L'export passe par la feuille de partage du système : c'est l'utilisateur
 * qui choisit où le fichier va (Drive, e-mail à soi-même…). Aucun service
 * tiers n'est imposé, et rien ne quitte le téléphone sans son geste.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { lireSauvegarde, nomDeFichier, type Lecture, type Sauvegarde } from '@/lib/backup';

/**
 * Écrit la sauvegarde dans le cache puis ouvre le partage.
 *
 * Le dossier est vidé à chaque export : une seule copie en clair reste dans
 * le cache de l'application, la plus récente. On ne la supprime pas juste
 * après le partage, l'application choisie pouvant encore être en train de
 * la lire.
 */
export async function partagerSauvegarde(
  sauvegarde: Sauvegarde,
  titre: string
): Promise<'ok' | 'indisponible'> {
  if (!(await Sharing.isAvailableAsync())) return 'indisponible';

  const dossier = new Directory(Paths.cache, 'sauvegardes');
  if (dossier.exists) dossier.delete();
  dossier.create();

  const fichier = new File(dossier, nomDeFichier(new Date(sauvegarde.exportedAt)));
  fichier.create();
  await fichier.write(JSON.stringify(sauvegarde, null, 2));

  await Sharing.shareAsync(fichier.uri, {
    mimeType: 'application/json',
    dialogTitle: titre,
    UTI: 'public.json',
  });
  return 'ok';
}

/**
 * Laisse choisir un fichier et le lit. `null` si l'utilisateur renonce.
 *
 * Tous les types de fichier sont proposés : selon l'application d'où il
 * vient (WhatsApp, Drive…), un `.json` n'est pas toujours annoncé comme tel.
 * C'est la validation qui tranche.
 */
export async function choisirSauvegarde(): Promise<Lecture | null> {
  const choix = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (choix.canceled) return null;

  const copie = new File(choix.assets[0].uri);
  try {
    return lireSauvegarde(await copie.text());
  } catch {
    return { ok: false, raison: 'fichier' };
  } finally {
    // La copie faite par le sélecteur contient des données personnelles.
    try {
      copie.delete();
    } catch {
      // déjà absente
    }
  }
}
