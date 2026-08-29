import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Les visites de suivi.
 *
 * La « prochaine visite » d'un dossier n'est pas stockée sur le dossier : elle
 * se déduit de la première visite planifiée à venir. Dupliquer l'information
 * garantirait qu'elle finisse par diverger.
 */
export default class extends BaseSchema {
  protected tableName = 'visits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)

      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .index()

      table
        .uuid('convert_id')
        .notNullable()
        .references('id')
        .inTable('converts')
        .onDelete('CASCADE')
        .index()

      table.timestamp('scheduled_at').notNullable().index()

      /**
       * planned · done · postponed · missed · cancelled
       */
      table.string('status', 16).notNullable().defaultTo('planned')

      table.text('report').nullable()
      table.timestamp('completed_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
