/**
 * @harvest/core — code partagé, framework-agnostique (aucun import
 * React Native / Expo / DOM). Consommé par le mobile, le web, le desktop
 * et le serveur.
 *
 * ⚠️ Les imports relatifs portent une extension `.js`, y compris depuis des
 * fichiers TypeScript, parce que Node l'exige en ESM. Ni Metro ni Turbopack
 * ne savent la faire pointer vers un `.ts` : c'est pour cela que ce paquet
 * est compilé vers `dist/` au lieu d'être consommé en source. Les trois
 * applications lisent le même artefact.
 *
 * Conséquence à connaître : modifier ce paquet demande de le recompiler.
 * `turbo dev` s'en charge (`dependsOn: ^build`), un `expo start` lancé seul
 * depuis `apps/mobile`, non.
 */
export * from './types.js';
export * from './status.js';
export * from './i18n.js';
export * from './theme.js';
export * from './dates.js';
export * from './view.js';
export * from './api.js';
