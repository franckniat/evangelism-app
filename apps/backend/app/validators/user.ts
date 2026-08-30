import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),

  /**
   * Église de rattachement, saisie libre. Facultative : on n'empêche pas
   * quelqu'un de commencer à suivre des personnes parce qu'il n'a pas
   * encore décidé quoi écrire ici.
   */
  church: vine.string().trim().maxLength(160).nullable().optional(),
})

/**
 * Mise à jour du profil. Ni l'adresse ni le mot de passe : changer l'un ou
 * l'autre déplace l'identité du compte et demande une vérification
 * (courriel de confirmation, mot de passe actuel) qui n'existe pas encore.
 */
export const updateProfileValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(160).optional(),
  church: vine.string().trim().maxLength(160).nullable().optional(),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/**
 * Validator for exchanging a refresh token against a new token pair
 */
export const refreshValidator = vine.create({
  refreshToken: vine.string(),
})

/**
 * Validator to use when signing out.
 *
 * The refresh token is optional: a client that already lost it must still be
 * able to log out, otherwise it keeps retrying with a credential it is trying
 * to get rid of.
 */
export const logoutValidator = vine.create({
  refreshToken: vine.string().optional(),
})

/**
 * Validator for the session identifier carried in the URL.
 *
 * `family_id` is a Postgres `uuid` column: handing it anything else raises a
 * database error, which would surface as a 500 where a 404 is meant.
 */
export const sessionIdValidator = vine.create({
  id: vine.string().uuid(),
})
