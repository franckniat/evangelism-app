import { configApp } from '@adonisjs/eslint-config'

export default [
  /**
   * `database/schema.ts` est réécrit par `node ace migration:run` et porte
   * l'avertissement « DO NOT EDIT manually ». Le générateur ne met pas en
   * forme comme Prettier : le laisser dans le périmètre du linter revient à
   * casser la CI à chaque migration, pour une divergence que personne ne
   * peut corriger durablement.
   */
  { ignores: ['database/schema.ts'] },
  ...configApp(),
]
