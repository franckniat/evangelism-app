# Harvest — Desktop (Tauri)

Application desktop qui enveloppe l'application web `@harvest/web`.
Elle consomme la même API AdonisJS que le mobile et le web.

## Prérequis

- **Rust** (stable) et **Cargo** — https://rustup.rs
- **Windows** : outils de build C++ de Visual Studio (linker MSVC)
- **Linux** : `webkit2gtk` et dépendances associées (voir la doc Tauri)

## Développement

```bash
bun run --filter @harvest/desktop dev
```

`beforeDevCommand` démarre automatiquement le serveur Next.js, puis Tauri
ouvre une fenêtre native sur `http://localhost:3000`.

L'API doit tourner en parallèle :

```bash
bun run backend
```

## Build de production — à finaliser

`tauri.conf.json` pointe `frontendDist` vers `../../web/out`, ce qui suppose
un **export statique** de Next.js (`output: 'export'` dans
`apps/web/next.config.ts`).

Cette option n'est **pas encore activée** : elle désactive les
fonctionnalités serveur de Next (rendu serveur, routes API), ce qui est
acceptable pour un tableau de bord qui interroge l'API côté client, mais
pénalise le référencement de la page vitrine.

Deux pistes à arbitrer avant le premier build :

1. **Export statique global** — simple, mais la landing perd le rendu serveur.
2. **Séparer les deux** — landing en rendu serveur côté web, et une entrée
   dédiée exportée statiquement pour le desktop.

Le mode développement fonctionne dans les deux cas.
