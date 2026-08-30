#!/usr/bin/env bash
#
# Sauvegarde de la base Moisson.
#
# Ce que contient le fichier produit : les noms, numéros et positions
# religieuses de personnes qui n'ont jamais ouvert de compte. Une sauvegarde
# est donc exactement aussi sensible que la base — elle doit être chiffrée au
# repos et rangée là où le serveur applicatif n'a pas accès en lecture.
#
# Usage :
#   DATABASE_URL=… DESTINATION=/var/sauvegardes ./scripts/sauvegarde.sh
#
# Prévu pour être appelé par cron. Exemple, toutes les nuits à 2 h 15 :
#   15 2 * * * DATABASE_URL=… DESTINATION=… /chemin/scripts/sauvegarde.sh >> /var/log/moisson-sauvegarde.log 2>&1

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL est obligatoire}"
DESTINATION="${DESTINATION:-./sauvegardes}"
RETENTION_JOURS="${RETENTION_JOURS:-14}"

horodatage="$(date +%Y%m%d-%H%M%S)"
fichier="${DESTINATION}/moisson-${horodatage}.dump"

mkdir -p "$DESTINATION"

# `--format=custom` plutôt qu'un fichier SQL : il est compressé, il permet une
# restauration sélective, et `pg_restore` sait le relire même si la version du
# serveur a changé entre-temps.
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$fichier"

# Lisible par le seul propriétaire. Une sauvegarde en 0644 dans un répertoire
# partagé annule tout le reste.
chmod 600 "$fichier"

taille="$(du -h "$fichier" | cut -f1)"
echo "$(date -Is) sauvegarde écrite : ${fichier} (${taille})"

# Vérification immédiate : un fichier qu'on ne sait pas relire n'est pas une
# sauvegarde. `pg_restore --list` échoue si l'archive est tronquée ou corrompue.
if ! pg_restore --list "$fichier" > /dev/null; then
  echo "$(date -Is) ÉCHEC : l'archive produite est illisible" >&2
  exit 1
fi

# Rotation. La suppression vient après la vérification, jamais avant : on ne
# jette une ancienne sauvegarde qu'une fois la nouvelle prouvée lisible.
supprimees="$(find "$DESTINATION" -name 'moisson-*.dump' -type f -mtime "+${RETENTION_JOURS}" -print -delete | wc -l)"
echo "$(date -Is) rotation : ${supprimees} archive(s) de plus de ${RETENTION_JOURS} jours supprimée(s)"
