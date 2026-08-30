#!/usr/bin/env bash
#
# Restauration d'épreuve : rejoue une sauvegarde dans une base jetable et
# vérifie qu'elle contient bien quelque chose.
#
# Une sauvegarde qu'on n'a jamais restaurée n'est pas une sauvegarde, c'est un
# fichier. Ce script existe pour que la question « est-ce qu'on saurait
# repartir ? » ait une réponse vérifiée, et non supposée.
#
# Usage :
#   ADMIN_URL=postgresql://…/postgres ./scripts/restauration-test.sh chemin/vers.dump
#
# ADMIN_URL doit pointer une base sur laquelle on a le droit de faire CREATE
# DATABASE — typiquement `postgres`. La base d'épreuve est créée puis
# supprimée : elle ne touche jamais la base de production.

set -euo pipefail

: "${ADMIN_URL:?ADMIN_URL est obligatoire (une base sur laquelle CREATE DATABASE est permis)}"
archive="${1:?Indiquez le fichier de sauvegarde à éprouver}"

if [ ! -f "$archive" ]; then
  echo "Archive introuvable : $archive" >&2
  exit 1
fi

base="moisson_epreuve_$(date +%s)"
# On dérive l'URL de la base d'épreuve de l'URL d'administration sans jamais
# afficher l'une ni l'autre : elles contiennent un mot de passe.
url_epreuve="$(printf '%s' "$ADMIN_URL" | sed -E "s#/[^/?]+(\?|\$)#/${base}\1#")"

nettoyer() {
  psql --dbname="$ADMIN_URL" --quiet --command="DROP DATABASE IF EXISTS ${base};" > /dev/null 2>&1 || true
}
trap nettoyer EXIT

echo "$(date -Is) création de la base d'épreuve ${base}"
psql --dbname="$ADMIN_URL" --quiet --command="CREATE DATABASE ${base};"

echo "$(date -Is) restauration de $(basename "$archive")"
pg_restore --dbname="$url_epreuve" --no-owner --no-privileges "$archive"

echo "$(date -Is) vérification du contenu"

# Le résultat est capturé dans une variable plutôt que lu par un tube : un
# `exit` dans un `while` alimenté par un tube ne quitte que le sous-shell, et
# le script se terminerait en succès malgré l'échec.
compte="$(psql --dbname="$url_epreuve" --quiet --tuples-only --no-align --command="
  select
    (select count(*) from users)    as utilisateurs,
    (select count(*) from converts) as dossiers,
    (select count(*) from visits)   as visites,
    (select count(*) from sectors)  as secteurs;
")"

IFS='|' read -r utilisateurs dossiers visites secteurs <<< "$compte"

echo "  utilisateurs : ${utilisateurs}"
echo "  dossiers     : ${dossiers}"
echo "  visites      : ${visites}"
echo "  secteurs     : ${secteurs}"

# Une base restaurée sans un seul utilisateur signale une sauvegarde vide ou
# prise sur la mauvaise base. Mieux vaut échouer bruyamment ici que le
# découvrir le jour de la panne.
if [ "${utilisateurs}" -eq 0 ]; then
  echo "$(date -Is) ÉCHEC : aucune ligne dans « users » après restauration" >&2
  exit 1
fi

echo "$(date -Is) restauration d'épreuve réussie"
