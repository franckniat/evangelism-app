import type User from '#models/user'
import type Visit from '#models/visit'
import { BasePolicy } from '@adonisjs/bouncer'
import { belongsToUser } from '#abilities/ownership'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class VisitPolicy extends BasePolicy {
  view(user: User, resource: Visit): AuthorizerResponse {
    return belongsToUser(user, resource)
  }

  update(user: User, resource: Visit): AuthorizerResponse {
    return belongsToUser(user, resource)
  }

  destroy(user: User, resource: Visit): AuthorizerResponse {
    return belongsToUser(user, resource)
  }
}
