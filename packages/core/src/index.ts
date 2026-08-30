/**
 * @moisson/core — code partagé, framework-agnostique (aucun import
 * React Native / Expo / DOM). Consommé par le mobile, le web, le desktop
 * et le serveur.
 *
 * ⚠️ Les imports relatifs portent une extension `.js`, y compris depuis des
 * fichiers TypeScript. Metro et Next s'en passent, mais Node les exige en
 * ESM : sans elles, le serveur échoue à l'exécution — et pas à la
 * compilation, ce qui rend la panne d'autant plus surprenante.
 */
export * from './types.js';
export * from './status.js';
export * from './i18n.js';
export * from './theme.js';
export * from './dates.js';
export * from './view.js';
export * from './api.js';
