import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Device context, so a session list means something to the person reading it.
 *
 * "Chrome sur Windows, Douala, il y a 2 heures" is what lets someone answer
 * the only question that matters on that screen: was that me?
 *
 * Both columns are personal data about the *user*, not about a converti. They
 * are kept because they are what makes an account takeover noticeable, and
 * they disappear with the session they belong to.
 */
export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * Stored raw and formatted client-side. Parsing user agents server-side
       * needs a library that ages badly, for a string that is a hint anyway.
       */
      table.string('user_agent', 512).nullable()

      /**
       * 45 characters covers IPv6, including IPv4-mapped forms.
       */
      table.string('ip_address', 45).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_agent')
      table.dropColumn('ip_address')
    })
  }
}
