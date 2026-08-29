import type User from '#models/user'
import type Sector from '#models/sector'
import { BasePolicy } from '@adonisjs/bouncer'
import { belongsToUser } from '#abilities/ownership'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class SectorPolicy extends BasePolicy {
  view(user: User, resource: Sector): AuthorizerResponse {
    return belongsToUser(user, resource)
  }

  update(user: User, resource: Sector): AuthorizerResponse {
    return belongsToUser(user, resource)
  }

  destroy(user: User, resource: Sector): AuthorizerResponse {
    return belongsToUser(user, resource)
  }
}
