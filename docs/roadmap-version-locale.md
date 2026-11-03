# Roadmap — version 100 % locale de l'app mobile

> Document de travail. On avance **pas à pas** : chaque étape a un but, les
> fichiers touchés, et un critère de validation. On ne passe à la suivante
> qu'une fois la précédente verte.

## Objectif

Une application mobile qui fonctionne **entièrement sur l'appareil** : toutes
les données sur le téléphone, **aucun appel à l'API**, pas de connexion
serveur. Elle marche hors-ligne pour toujours, sans hébergement ni coût.

## Le principe : local-first

Le stockage de l'appareil devient la **source de vérité**. Toutes les
lectures et écritures sont locales et instantanées. L'app ne dépend plus du
réseau pour fonctionner.

L'**online viendra plus tard, au fur et à mesure**, en se *greffant* sur
cette base sans la réécrire : une future couche de synchronisation lira le
stock local et le réconciliera avec l'API en arrière-plan. C'est pour cela
qu'on garde dès maintenant un **point de passage unique** (le *repository*)
et des identifiants déjà prêts pour la synchro.

## Décisions prises (2026‑11‑01)

| Sujet | Choix |
|---|---|
| **Portée** | Local d'abord ; l'online se greffera plus tard, incrémentalement. |
| **Accès** | Aucun login. Onboarding au 1er lancement (nom, église, secteurs), puis verrou biométrique optionnel (déjà codé, `LockGate`). |
| **Sauvegarde** | Export / import manuel d'un fichier `.json` (aucun service tiers). |

## Ce qui joue déjà en notre faveur

- L'app était **locale à l'origine** (`AppContext` sur AsyncStorage) ; on
  revient à un modèle plus simple, pas à un territoire inconnu.
- Le type `Convert` de `@harvest/core` porte **déjà** tout ce qu'il faut côté
  client : `history` (le fil), `nextVisit`, `done`, `reminderId`. Pas besoin
  des entités serveur `visits` / `convert_events` en local.
- Les identifiants sont **déjà des UUID tirés sur l'appareil** — exactement
  ce qu'une future synchro exige (rien à réconcilier).
- Les 14 écrans consomment le contexte via `useApp()` : si on garde la même
  **surface publique**, **aucun écran ne change**.

## Architecture cible

```
Écrans (14)  ──useApp()──►  AppContext  ──►  repository (lib/local-store)  ──►  AsyncStorage
                                 │
                                 └── (plus tard) SyncEngine ──► API Harvest
```

- `AppContext` garde son interface publique actuelle.
- Un **repository local** (`lib/local-store.ts`) détient toute la
  persistance. C'est le **seul** endroit qui touche au stockage — donc le
  seul point où la synchro future viendra se brancher.
- La couche réseau actuelle (`lib/api`, `outbox`, `session`, `migration`,
  `config`) sort du chemin actif. Elle reste dans l'historique git ;
  l'online futur sera un module de synchro **dédié**, pas ce code-là (il
  était bâti pour une authentification serveur qui ne colle plus au
  local-first).

---

## Les étapes

### Étape 0 — Décisions ✅
Faite (tableau ci-dessus).

### Étape 1 — Le repository local ✅ (#37)
**But :** un module unique qui lit/écrit tout le domaine en local.
- Créer `lib/local-store.ts` : charge/persiste `profil`, `secteurs`,
  `convertis` (avec `history` + `nextVisit`), `notifications`, `réglages`,
  `introSeen`, `photoUri`.
- Ajouter `updatedAt` sur chaque enregistrement (inutile aujourd'hui,
  indispensable à la synchro de demain — on le pose maintenant pour ne pas
  avoir à migrer plus tard).
- Reprendre les clés AsyncStorage existantes de `lib/storage.ts`.

**Validation :** `bun run --filter @harvest/mobile typecheck` vert ; un petit
test manuel d'écriture/lecture.

### Étape 2 — Brancher `AppContext` sur le repository (#38)
> Code livré et éprouvé sur Expo Web. **Reste à valider sur téléphone** : import
> de contacts et rappels n'existent pas sur le web.

**But :** l'app lit et écrit en local, instantanément, sans réseau.
- Réécrire `context/AppContext.tsx` : chaque action modifie l'état **et**
  persiste via le repository. On retire `outbox`, `api`, `session`, `sync`,
  `pending/offline/rejected`, `drain`, `push`.
- Garder **la même surface `useApp()`** (mêmes noms d'actions) pour ne pas
  toucher les écrans. Les actions `syncNow`/`loadConvertHistory` disparaissent
  ou deviennent des non-ops.
- `nextVisit` et `history` vivent de nouveau **sur le converti** (plus de
  `plannedVisits` ni d'appels `visit.*`).

**Validation :** typecheck + lint verts ; l'app démarre, CRUD convertis +
secteurs + calendrier + import contacts fonctionnent hors-ligne.

### Étape 3 — Retirer l'authentification serveur (#39)
> Code livré et éprouvé sur Expo Web. **Reste à valider sur téléphone** : le
> verrou biométrique n'existe pas sur le web.

**But :** pas de login ; premier lancement → onboarding → app.
- `app/_layout.tsx` : retirer la redirection vers `login`. Logique : pas de
  profil local → `onboarding` → `setup-profile` → `setup-sectors` → accueil.
  Garder `LockGate`.
- Supprimer `app/login.tsx` et `app/register.tsx` ; `app/setup-profile.tsx`
  remplace ce dernier.
- Le **profil** (nom, église, photo) est saisi à l'onboarding et stocké en
  local ; `app/profile.tsx` l'édite en local.
- `lib/auth.ts` (hash mot de passe) n'a plus lieu d'être → supprimer.

**Validation :** premier lancement sur un appareil neuf = onboarding, aucun
écran de connexion ; le verrou biométrique fonctionne toujours.

### Étape 4 — Export / import des données (#40)
**But :** le filet de sécurité (téléphone perdu = tout perdu sinon).
- Installer `expo-file-system`, `expo-sharing`, `expo-document-picker`.
- Dans les **Réglages** : « Exporter mes données » → sérialise tout le stock
  local en un `.json` horodaté et ouvre le partage (Drive, WhatsApp, e-mail à
  soi-même…).
- « Importer depuis un fichier » → choisit un `.json`, le **valide**, puis
  remplace (avec confirmation) le contenu local. Sert aussi à changer de
  téléphone.

**Validation :** export sur l'appareil A, import sur l'appareil B → mêmes
données, sans doublon.

### Étape 5 — Nettoyage de la couche réseau (#41)
**But :** une app locale **propre**, sans code mort trompeur.
- Retirer du chemin actif et supprimer : `lib/api.ts`, `lib/outbox.ts`,
  `lib/session.ts`, `lib/migration.ts`, `lib/config.ts`, `components/ui/SyncBanner.tsx`.
- Retirer `expo-secure-store` des dépendances (ne servait qu'aux jetons).
- `@harvest/core` reste la source des types/i18n/thème ; on peut y laisser
  `api.ts` (DTO) — il ne sert au mobile local qu'indirectement, et resservira
  à l'online. À trancher à l'étape.

**Validation :** typecheck + lint verts ; `grep` ne trouve plus d'import de
`lib/api` / `outbox` / `session` dans `apps/mobile`.

### Étape 6 — Build local & APK (#42)
**But :** un APK qui ne dépend d'**aucun** serveur.
- Plus besoin d'`EXPO_PUBLIC_API_URL` : retirer `apps/mobile/.env` /
  l'`env` du profil EAS.
- `eas build --platform android --profile pilote` → APK autonome.

**Validation :** APK installé, l'app marche **en mode avion dès la première
ouverture**, sans jamais avoir eu de réseau.

### Étape 7 — Vérification sur appareil & docs (#43)
**But :** prouver le tout sur un vrai téléphone, documenter.
- Parcours complet hors-ligne : onboarding, convertis, calendrier, statuts,
  notes, import contacts, **export puis import**, verrou biométrique.
- Mettre à jour `README`, `CLAUDE.md`/`AGENTS.md`, et noter la bascule dans
  une issue de suivi.

**Validation :** parcours vert de bout en bout, sans réseau.

---

## Plus tard — intégration online incrémentale (hors scope maintenant)

Quand on voudra l'online, on **ne réécrit pas l'app** : on ajoute un module
`sync` qui se branche sur le repository.

- **Déjà prêt :** UUID côté appareil, `updatedAt` sur chaque enregistrement.
- **À ajouter le moment venu :** un journal des changements (ou un drapeau
  « modifié depuis la dernière synchro ») et des *tombstones* pour propager
  les suppressions.
- **Le backend existe déjà** : l'API Harvest (Railway/Neon) et le tableau de
  bord web restent disponibles comme cible de synchro — l'app connectée
  actuelle montre d'ailleurs le chemin (file d'écriture, rotation de jetons),
  qu'on réintroduira proprement derrière le repository.

Principe directeur : **le local reste la source de vérité** ; la synchro est
un plus qui réconcilie en arrière-plan, jamais un préalable au fonctionnement.

## Ce qu'on ne fait pas maintenant

- Aucune synchro, aucun compte, aucun appel réseau.
- Pas de chiffrement des données au repos (le verrou de l'appareil + le
  verrou biométrique protègent déjà ; à réévaluer si le besoin émerge).
- iOS inchangé (toujours tributaire d'un compte Apple Developer, cf. #31).

## Questions ouvertes

- **Recueil du consentement.** La fiche garde `consentedAt` (`null` pour un
  contact importé), mais l'écran d'ajout ne demande rien : toute saisie manuelle
  est marquée consentie d'office, et la fiche mobile ne signale pas un
  consentement manquant.
- **Anciennes clés.** `harvest:user`, `harvest:photoUri`, `harvest:plannedVisits`
  et les jetons du trousseau restent sur les téléphones déjà connectés. À purger
  à l'étape 5, avant de retirer `expo-secure-store`.
