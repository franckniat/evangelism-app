import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Refresh tokens, stored as rotating families.
 *
 * Each login opens a family. Exchanging a refresh token revokes it and issues
 * its successor within the same family. Revoked rows are kept rather than
 * deleted: presenting one again is the signal that a token was stolen, and
 * that signal only exists if the row survives.
 */
export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      /**
       * Rotation chain opened at login. Revoking a family logs out the device
       * it belongs to, and only that one.
       */
      table.uuid('family_id').notNullable().index()

      /**
       * SHA-256 of the token secret. The secret itself is returned once and
       * never stored: a database dump must not hand over usable sessions.
       */
      table.string('hash', 64).notNullable().unique()

      table.timestamp('expires_at').notNullable()

      /**
       * Set when the token is exchanged for its successor.
       */
      table.timestamp('used_at').nullable()

      /**
       * Kept alongside `used_at` so a replayed token can be told apart from
       * one that was merely deliberately revoked.
       */
      table.timestamp('revoked_at').nullable()
      table.string('revoked_reason').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
