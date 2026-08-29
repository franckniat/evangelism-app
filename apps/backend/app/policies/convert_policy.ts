import type User from '#models/user'
import type Convert from '#models/convert'
import { BasePolicy } from '@adonisjs/bouncer'
import { belongsToUser } from '#abilities/ownership'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'

export default class ConvertPolicy extends BasePolicy {
  view(user: User, resource: Convert): AuthorizerResponse {
    return belongsToUser(user, resource)
  }

  update(user: User, resource: Convert): AuthorizerResponse {
    return belongsToUser(user, resource)
  }

  destroy(user: User, resource: Convert): AuthorizerResponse {
    return belongsToUser(user, resource)
  }
}
