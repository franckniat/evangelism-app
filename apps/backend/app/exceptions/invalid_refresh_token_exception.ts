import { Exception } from '@adonisjs/core/exceptions'

/**
 * Raised whenever a refresh token cannot be exchanged: unknown, expired,
 * already used or explicitly revoked.
 *
 * The message is deliberately identical in every case. Telling a caller
 * *why* the exchange failed would let them probe which tokens exist.
 */
export default class InvalidRefreshTokenException extends Exception {
  static status = 401
  static code = 'E_INVALID_REFRESH_TOKEN'
  static message = 'Invalid or expired refresh token'
}
