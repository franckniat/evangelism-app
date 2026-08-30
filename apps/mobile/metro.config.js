// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Faire accepter à Metro les imports relatifs en `.js` du paquet partagé.
 *
 * `@moisson/core` écrit `export * from './types.js'` alors que le fichier
 * s'appelle `types.ts`. Ce n'est pas une coquille : Node en ESM exige une
 * extension complète, et le serveur consomme les sources TypeScript
 * directement — sans ces `.js`, il échoue à l'exécution.
 *
 * Metro, lui, prend l'extension au pied de la lettre et cherche un fichier
 * `.js` qui n'existe pas. On rattrape donc l'échec en réessayant sans
 * extension, ce qui laisse la résolution habituelle faire son travail.
 *
 * Le repli ne s'applique qu'aux chemins relatifs : un vrai `.js` de
 * `node_modules` est résolu du premier coup et ne passe jamais par ici.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch {
      return context.resolveRequest(context, moduleName.slice(0, -'.js'.length), platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
