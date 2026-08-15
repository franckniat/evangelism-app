// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // `.expo` contient des types régénérés à chaque démarrage : les analyser
    // produit des avertissements sur du code que personne n'écrit.
    ignores: ['dist/*', '.expo/*'],
  },
]);
