import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

/**
 * Couvre la rotation des jetons de rafraîchissement et la détection de vol.
 *
 * Ces règles avaient été validées à la main lors de leur écriture ; elles le
 * sont désormais à chaque exécution. Le bug qu'elles ont attrapé — une
 * révocation annulée par le rollback de sa propre transaction — passait le
 * typecheck et le lint sans broncher.
 */

const password = 'motdepasse-de-test'

async function signup(client: ApiClient, email: string) {
  const response = await client.post('/api/v1/auth/signup').json({
    fullName: 'Compte de test',
    email,
    password,
    passwordConfirmation: password,
  })

  return response.body().data
}

test.group('Jetons — émission', () => {
  test("l'inscription renvoie une paire de jetons datée", async ({ client, assert }) => {
    const response = await client.post('/api/v1/auth/signup').json({
      fullName: 'Nouvelle recrue',
      email: 'emission@example.test',
      password,
      passwordConfirmation: password,
    })

    response.assertStatus(200)
    const { accessToken, refreshToken } = response.body().data

    assert.isString(accessToken.value)
    assert.isString(refreshToken.value)
    assert.isNotNull(accessToken.expiresAt, "le jeton d'accès doit expirer")
    assert.isNotNull(refreshToken.expiresAt)
    assert.notInclude(JSON.stringify(response.body()), password)
  })

  test("le jeton d'accès ouvre le profil, son absence le ferme", async ({ client }) => {
    const { accessToken } = await signup(client, 'profil@example.test')

    const autorise = await client.get('/api/v1/account/profile').bearerToken(accessToken.value)
    autorise.assertStatus(200)

    const anonyme = await client.get('/api/v1/account/profile')
    anonyme.assertStatus(401)
  })
})

test.group('Jetons — rotation', () => {
  test('un échange délivre une paire entièrement neuve', async ({ client, assert }) => {
    const initial = await signup(client, 'rotation@example.test')

    const response = await client
      .post('/api/v1/auth/refresh')
      .json({ refreshToken: initial.refreshToken.value })

    response.assertStatus(200)
    const { accessToken, refreshToken } = response.body().data

    assert.notEqual(refreshToken.value, initial.refreshToken.value)
    assert.notEqual(accessToken.value, initial.accessToken.value)

    const profil = await client.get('/api/v1/account/profile').bearerToken(accessToken.value)
    profil.assertStatus(200)
  })

  test('rejouer un jeton déjà échangé révoque toute la famille', async ({ client }) => {
    const initial = await signup(client, 'rejeu@example.test')

    const premier = await client
      .post('/api/v1/auth/refresh')
      .json({ refreshToken: initial.refreshToken.value })
    premier.assertStatus(200)
    const courant = premier.body().data.refreshToken

    /**
     * Le jeton initial a déjà servi. Le représenter est soit un rejeu du
     * client légitime, soit une copie — rien ne permet de les distinguer,
     * donc on traite le cas comme un vol.
     */
    const rejeu = await client
      .post('/api/v1/auth/refresh')
      .json({ refreshToken: initial.refreshToken.value })
    rejeu.assertStatus(401)

    /**
     * Le cœur du mécanisme : le jeton *courant* doit tomber lui aussi.
     * S'il survit, le voleur garde la main et la détection ne sert à rien.
     */
    const apres = await client.post('/api/v1/auth/refresh').json({ refreshToken: courant.value })
    apres.assertStatus(401)
  })

  test('un jeton inconnu est refusé sans révéler pourquoi', async ({ client, assert }) => {
    const response = await client
      .post('/api/v1/auth/refresh')
      .json({ refreshToken: 'jeton-qui-nexiste-pas' })

    response.assertStatus(401)
    assert.notInclude(JSON.stringify(response.body()).toLowerCase(), 'revoked')
  })
})

test.group('Jetons — déconnexion', () => {
  test('la déconnexion ferme la session présentée', async ({ client }) => {
    const { accessToken, refreshToken } = await signup(client, 'deconnexion@example.test')

    const logout = await client
      .post('/api/v1/account/logout')
      .bearerToken(accessToken.value)
      .json({ refreshToken: refreshToken.value })
    logout.assertStatus(200)

    const rafraichir = await client
      .post('/api/v1/auth/refresh')
      .json({ refreshToken: refreshToken.value })
    rafraichir.assertStatus(401)

    const profil = await client.get('/api/v1/account/profile').bearerToken(accessToken.value)
    profil.assertStatus(401)
  })
})
