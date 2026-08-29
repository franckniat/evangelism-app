import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Les secteurs d'évangélisation d'un utilisateur.
 *
 * Identifiants en UUID : l'application mobile doit pouvoir créer un secteur
 * hors ligne et lui donner tout de suite son identifiant définitif, sans quoi
 * il faudrait réconcilier des identifiants provisoires à la reconnexion.
 */
export default class extends BaseSchema {
  protected tableName = 'sectors'

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

      table.string('name', 120).notNullable()
      table.string('city', 120).nullable()
      table.string('country', 120).nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Deux secteurs du même nom chez la même personne n'ont pas de sens.
      table.unique(['user_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
