import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Le dossier d'une personne rencontrée lors de l'évangélisation.
 *
 * ⚠️ Ces lignes décrivent des personnes qui n'ont jamais ouvert de compte et
 * n'ont rien signé. Le champ le plus sensible du projet est ici : `status`,
 * qui porte un positionnement religieux nominatif.
 *
 * Chaque dossier appartient à un utilisateur, et à lui seul. Il n'y a ni
 * portée, ni église, ni partage : c'est ce qui rend l'autorisation triviale
 * à ce stade du produit.
 */
export default class extends BaseSchema {
  protected tableName = 'converts'

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
        .uuid('sector_id')
        .nullable()
        .references('id')
        .inTable('sectors')
        // Perdre un secteur ne doit pas faire perdre les dossiers qu'il portait.
        .onDelete('SET NULL')
        .index()

      table.string('first_name', 120).notNullable()
      table.string('last_name', 120).nullable()

      // Téléphone ou courriel : au moins l'un des deux, vérifié côté validation.
      table.string('phone', 32).nullable()
      table.string('email', 254).nullable()

      table.string('sex', 1).nullable()
      table.string('status', 32).notNullable().defaultTo('reflexion')
      table.text('notes').nullable()

      /**
       * Trace du fait que la personne a été informée que ses coordonnées
       * sont conservées pour être recontactée. Trois secondes sur le terrain,
       * et ce qui distingue un suivi respectueux d'un fichier subi.
       */
      table.timestamp('consented_at').nullable()

      table.timestamp('met_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
