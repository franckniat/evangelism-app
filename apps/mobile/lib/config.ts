/**
 * Adresse de l'API.
 *
 * `EXPO_PUBLIC_API_URL` est lue au moment du bundle, pas à l'exécution : elle
 * finit en clair dans l'application livrée. C'est acceptable ici — une URL
 * publique n'est pas un secret — mais c'est la raison pour laquelle aucune
 * clé ne doit jamais passer par une variable `EXPO_PUBLIC_*`.
 *
 * Pièges de développement, dans l'ordre où on les rencontre :
 *   • émulateur Android : `localhost` désigne l'émulateur lui-même, pas la
 *     machine hôte — utiliser `http://10.0.2.2:3333` ;
 *   • téléphone physique : ni l'un ni l'autre, il faut l'adresse de la
 *     machine sur le réseau local, et le serveur doit écouter dessus
 *     (`HOST=0.0.0.0`).
 */
const DEFAULT_URL = 'http://localhost:3333/api/v1';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_URL).replace(/\/+$/, '');
