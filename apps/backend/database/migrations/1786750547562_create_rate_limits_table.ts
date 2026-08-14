import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Counters for the rate limiter. Schema imposed by @adonisjs/limiter's
 * database store, do not rename the columns.
 */
export default class extends BaseSchema {
  protected tableName = 'rate_limits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).notNullable().primary()
      table.integer('points', 9).notNullable().defaultTo(0)
      table.bigint('expire').unsigned()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
