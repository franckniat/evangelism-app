import type User from '#models/user'

/**
 * La règle d'accès du produit, écrite une seule fois.
 *
 * Aujourd'hui elle tient en une ligne : une ressource appartient à une
 * personne, et à elle seule. Elle est malgré tout isolée ici plutôt que
 * recopiée dans chaque politique, parce que c'est ce point précis qui
 * s'élargira quand les églises et les partages arriveront — et qu'une règle
 * recopiée à cinq endroits ne s'élargit jamais aux cinq.
 *
 * ⚠️ Aucun contrôleur ne doit tester la propriété lui-même. Le jour où la
 * règle devient « propriétaire ou vivier d'église ou partage accepté », tout
 * ce qui ne passe pas par ici sera une faille silencieuse.
 */
export function belongsToUser(user: User, resource: { userId: number } | null): boolean {
  if (!resource) {
    return false
  }

  return resource.userId === user.id
}
