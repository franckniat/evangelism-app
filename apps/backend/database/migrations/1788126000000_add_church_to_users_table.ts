import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * L'église de rattachement de l'évangéliste.
 *
 * Purement déclaratif tant qu'il n'existe pas d'entité « église » : c'est
 * une chaîne libre que l'utilisateur saisit lui-même, affichée sur son
 * profil. Le jour où les églises deviennent des comptes à part entière,
 * cette colonne servira à proposer un rattachement — pas à le décider.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('church', 160).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('church')
    })
  }
}
