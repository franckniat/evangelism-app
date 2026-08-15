<div align="center">

# 🌱 Moisson

**Application collaborative de suivi d'évangélisation — mobile, web et desktop.**

[![Licence](https://img.shields.io/badge/licence-AGPL--3.0-blue.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg)](https://nextjs.org)
[![AdonisJS](https://img.shields.io/badge/AdonisJS-7-5A45FF.svg)](https://adonisjs.com)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131.svg)](https://tauri.app)

</div>

---

## À propos

**Moisson** aide les évangélistes à récolter et suivre les personnes rencontrées lors de
l'évangélisation, organisées par **secteur**, et à travailler **en équipe**.

Plutôt que de disperser les contacts dans des carnets ou des conversations WhatsApp, l'application
centralise chaque converti, planifie les visites de suivi et permet à plusieurs évangélistes d'une
même église de collaborer sur les mêmes données.

Le projet est pensé pour le **contexte camerounais** : indicatifs `+237`, villes locales, et une
tolérance au réseau instable (les données restent consultables hors connexion).

## Fonctionnalités

| | |
|---|---|
| 👤 **Convertis** | Nom, téléphone, sexe, secteur, statut, notes — avec recherche et filtres |
| 📍 **Secteurs** | Zones d'évangélisation avec compteurs de convertis |
| 📅 **Suivi** | Planification des visites, historique, statuts (Sauvé, Non sauvé, Sceptique, En réflexion, Baptisé) |
| 👥 **Équipes** | Groupes collaboratifs, rôles, invitation par lien partageable |
| 📇 **Contacts** | Enregistrement d'un converti dans le répertoire du téléphone en un clic |
| 🔔 **Rappels** | Notifications locales pour ne pas oublier une visite |
| 🔒 **Verrouillage** | Protection de l'application par biométrie ou code |
| 🌍 **Confort** | Bilingue FR/EN, thème clair/sombre |

## Architecture

Monorepo géré avec **Bun workspaces** et **Turborepo**.

```
moisson/
├─ apps/
│  ├─ mobile/     Expo SDK 54 · Expo Router 6
│  ├─ web/        Next.js 16.3 · shadcn/ui · Tailwind v4
│  ├─ desktop/    Tauri v2 (enveloppe l'application web)
│  └─ backend/    AdonisJS 7 — API REST
└─ packages/
   └─ core/       @moisson/core — types, i18n, thème, logique partagée
```

Les trois clients consomment la **même API**. La logique métier commune (types, statuts, traductions,
calculs d'échéance, jetons de thème) vit dans `@moisson/core` afin de n'être écrite qu'une fois.

## Prérequis

- **[Bun](https://bun.sh)** 1.3+ — gestionnaire de paquets et exécuteur
- **Node.js** 20+
- **[Rust](https://rustup.rs)** — uniquement pour l'application desktop
  - Windows : outils de build C++ de Visual Studio
  - Linux : `webkit2gtk` et dépendances associées

## Démarrage

```bash
git clone https://github.com/franckniat/evangelism-app.git
cd evangelism-app
bun install
cp .env.example .env
```

Puis lancez l'application souhaitée :

```bash
bun run backend    # API        → http://localhost:3333
bun run web        # Web        → http://localhost:3000
bun run mobile     # Mobile     → Expo (QR code)
bun run desktop    # Desktop    → fenêtre native (démarre le web automatiquement)
```

> Les fonctions natives du mobile (contacts, appel, rappels, biométrie) nécessitent un **appareil
> réel ou un émulateur** : elles ne fonctionnent pas dans le navigateur.

## Commandes du monorepo

| Commande | Effet |
|---|---|
| `bun run typecheck` | Vérifie les types sur tous les workspaces |
| `bun run lint` | Analyse le code de tous les workspaces |
| `bun run build` | Construit tous les workspaces |
| `bun run dev` | Démarre tout en parallèle |

Turborepo met les tâches en cache : les exécutions suivantes sont quasi instantanées.

## Configuration

Copiez `.env.example` vers `.env` :

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de l'API pour le client mobile |
| `NEXT_PUBLIC_API_URL` | URL de l'API pour le client web |

> ⚠️ Les variables préfixées `EXPO_PUBLIC_` / `NEXT_PUBLIC_` sont **embarquées en clair** dans les
> applications distribuées. N'y placez jamais de secret : clés d'API privées, mots de passe ou jetons
> d'administration doivent rester côté serveur uniquement.

Le serveur a sa propre configuration : copiez `apps/backend/.env.example` vers `apps/backend/.env`.
Chaque variable y est documentée. Les principales :

| Variable | Rôle |
|---|---|
| `APP_KEY` | Clé de chiffrement de l'application. **Différente par environnement.** |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL — contient un mot de passe |
| `DB_SSL` | Vérification du certificat. `true` partout sauf serveur local |
| `LIMITER_STORE` | Support de la limitation de débit (`database` / `memory`) |
| `QUEUE_ENABLED` | Active les workers de la file de travaux |
| `CORS_ORIGIN` | Origines autorisées en production, séparées par des virgules |

Les variables sont **validées au démarrage** : une configuration incomplète fait échouer le serveur
immédiatement plutôt que de le laisser tourner à moitié.

### Environnements

| | Base de données | Limitation | File | TLS |
|---|---|---|---|---|
| **Développement** | Postgres local | `database` | active | `DB_SSL=false` accepté |
| **Test** | **base séparée** | `memory` | désactivée | — |
| **Production** | base gérée | `database` | active | `DB_SSL=true` obligatoire |

> ⚠️ Sans `DATABASE_URL` propre dans `apps/backend/.env.test`, les tests héritent de la base de
> développement **et la remettent à zéro**. À configurer avant d'écrire le premier test.

### Secrets

- `.env`, `.env.test` et toute variante sont exclus par `.gitignore` ; seuls les `.env.example` sont
  versionnés, et ils ne contiennent que des valeurs factices.
- Le dépôt est public et **l'historique Git est permanent** : un secret publié une fois est compromis
  pour toujours, même supprimé au commit suivant. Il doit être **révoqué**, pas effacé.
- L'intégration continue analyse chaque poussée à la recherche de secrets, sur l'historique complet.
- Générez une `APP_KEY` distincte par environnement avec `node ace generate:key`.

## État d'avancement

Le projet est en développement actif. La feuille de route est suivie publiquement.

- ✅ **Socle technique** — monorepo, quatre applications initialisées, package partagé
- ✅ **Interface mobile** — écrans complets (convertis, secteurs, suivi, thème, bilingue)
- 🚧 **API** — AdonisJS initialisé ; schéma métier et authentification en cours
- 🚧 **Collaboration** — groupes et invitations à implémenter
- ⏳ **Web** — landing page et tableau de bord à construire
- ⏳ **Desktop** — build de production à finaliser

À ce stade, l'application mobile fonctionne avec un **stockage local** : le branchement à l'API
distante (et donc la synchronisation entre appareils) est la prochaine étape.

## Contribuer

Les contributions sont bienvenues. Quelques conventions :

- **Un commit = une seule chose.** Les commits fourre-tout compliquent la relecture et les retours arrière.
- Messages de commit en français, préfixés (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- `bun run typecheck` et `bun run lint` doivent passer avant toute pull request.
- La logique partagée entre plateformes va dans `packages/core`, jamais dupliquée.

## Licence

Distribué sous licence **[AGPL-3.0-only](LICENSE)** (GNU Affero General Public License, version 3).

Vous pouvez librement utiliser, étudier, modifier et redistribuer ce logiciel. En contrepartie, toute
version modifiée doit rester sous la même licence — **y compris si vous l'exploitez comme service en
ligne sans en distribuer le code**. C'est la clause qui distingue l'AGPL : elle garantit qu'un service
dérivé de Moisson reste ouvert et vérifiable, ce qui compte particulièrement pour une application qui
manipule des données personnelles sensibles.

> ⚠️ Si vous hébergez votre propre instance, l'article 13 de la licence vous oblige à proposer à vos
> utilisateurs un moyen d'obtenir le code source de la version que vous exécutez.

La licence ne régit que le **code**. L'usage des **données** saisies dans l'application relève des
conditions d'utilisation de l'instance concernée et du droit applicable à la protection des données
personnelles.

```
Moisson — application collaborative de suivi d'évangélisation
Copyright (C) 2026 Franck Niat

Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier selon
les termes de la GNU Affero General Public License telle que publiée par la Free Software
Foundation, en sa version 3.

Ce programme est distribué dans l'espoir qu'il sera utile, mais SANS AUCUNE GARANTIE, ni
explicite ni implicite. Voyez la GNU Affero General Public License pour plus de détails.

Vous devriez avoir reçu une copie de la licence avec ce programme. Sinon, voyez
<https://www.gnu.org/licenses/>.
```
