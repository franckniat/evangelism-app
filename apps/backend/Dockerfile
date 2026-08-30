# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# L'API Moisson.
#
# L'image se construit depuis la racine du dépôt, pas depuis ce dossier :
# l'espace de travail Bun hisse les dépendances à la racine et le serveur
# consomme `@moisson/core` compilé. Un contexte réduit à `apps/backend`
# donnerait une image à laquelle il manque la moitié de ses modules.
#
#   docker build -f apps/backend/Dockerfile -t moisson-api .
# ---------------------------------------------------------------------------

FROM oven/bun:1.3.14 AS constructeur

WORKDIR /app

# Les manifestes d'abord : tant qu'ils ne changent pas, Docker réutilise la
# couche d'installation, qui est de loin la plus lente.
COPY package.json bun.lock bunfig.toml ./
COPY packages/core/package.json packages/core/
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY apps/desktop/package.json apps/desktop/

RUN bun install --frozen-lockfile

COPY tsconfig.base.json turbo.json ./
COPY packages/core packages/core
COPY apps/backend apps/backend

# `@moisson/core` est consommé compilé : il doit exister avant que le serveur
# soit construit, sinon ses imports ne se résolvent pas.
RUN bun run --filter @moisson/core build

# `--ignore-ts-errors` : la vérification de types est le travail de la CI, pas
# celui de l'image. Échouer ici donnerait la même information plus tard et
# plus cher.
WORKDIR /app/apps/backend
RUN node ace build --ignore-ts-errors

# ---------------------------------------------------------------------------

FROM oven/bun:1.3.14-slim AS execution

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333

WORKDIR /app

# Les modules sont copiés depuis le constructeur plutôt que réinstallés : la
# sortie de `ace build` référence `@moisson/core` en dépendance d'espace de
# travail, qu'aucun `install` ne saurait résoudre hors du dépôt.
COPY --from=constructeur /app/node_modules ./node_modules
COPY --from=constructeur /app/packages/core/package.json ./packages/core/package.json
COPY --from=constructeur /app/packages/core/dist ./packages/core/dist
COPY --from=constructeur /app/apps/backend/build ./apps/backend
COPY --from=constructeur /app/apps/backend/node_modules ./apps/backend/node_modules

WORKDIR /app/apps/backend

# L'image tourne sans privilèges. `bun` est un utilisateur non root fourni par
# l'image de base.
USER bun

EXPOSE 3333

# Les migrations ne sont volontairement PAS lancées au démarrage : plusieurs
# instances qui démarrent ensemble les joueraient en concurrence. Elles se
# lancent explicitement au déploiement (voir docs/exploitation/deploiement.md).
CMD ["node", "bin/server.js"]
