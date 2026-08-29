import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Le fil d'un dossier : ce qui s'est passé, et quand.
 *
 * En ajout seul. Une note ou un appel ne se corrige pas — on en ajoute un
 * autre. C'est aussi ce qui rendra la table indolore à synchroniser : deux
 * appareils qui ajoutent chacun une ligne ne peuvent pas entrer en conflit.
 */
export default class extends BaseSchema {
  protected tableName = 'convert_events'

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

      table
        .uuid('convert_id')
        .notNullable()
        .references('id')
        .inTable('converts')
        .onDelete('CASCADE')
        .index()

      /**
       * created · note · call · status_changed · visit_planned · visit_done
       */
      table.string('type', 32).notNullable()
      table.text('text').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
