/**
 * Hachage du mot de passe (SHA-256). NB : stockage local uniquement, il s'agit
 * d'une authentification simulée — pas d'une sécurité de production.
 */
import * as Crypto from 'expo-crypto';

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}
