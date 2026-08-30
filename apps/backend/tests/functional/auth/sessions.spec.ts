import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

/**
 * Couvre la liste des appareils connectés et leur révocation à distance.
 *
 * Deux propriétés y sont vérifiées explicitement, parce qu'elles sont
 * silencieuses quand elles cassent : révoquer une session doit tuer aussi
 * ses jetons d'accès, et une session appartenant à quelqu'un d'autre doit
 * être introuvable plutôt qu'interdite.
 */

type Session = {
  id: string
  userAgent: string | null
  startedAt: string | null
  lastSeenAt: string | null
  current: boolean
}

/**
 * Échoue avec un message lisible plutôt que sur un « undefined » opaque
 * quinze lignes plus bas.
 */
function requis<T>(valeur: T | undefined, quoi: string): T {
  if (valeur === undefined) {
    throw new Error(`${quoi} : introuvable dans la réponse`)
  }
  return valeur
}

const password = 'motdepasse-de-test'

async function signup(client: ApiClient, email: string, userAgent: string) {
  const response = await client
    .post('/api/v1/auth/signup')
    .header('user-agent', userAgent)
    .json({ fullName: 'Compte de test', email, password, passwordConfirmation: password })

  return response.body().data
}

async function login(client: ApiClient, email: string, userAgent: string) {
  const response = await client
    .post('/api/v1/auth/login')
    .header('user-agent', userAgent)
    .json({ email, password })

  return response.body().data
}

async function sessions(client: ApiClient, token: string): Promise<Session[]> {
  const response = await client.get('/api/v1/account/sessions').bearerToken(token)
  return response.body().data.sessions
}

test.group('Sessions — inventaire', () => {
  test('chaque appareil apparaît une fois, un seul est « celui-ci »', async ({
    client,
    assert,
  }) => {
    const a = await signup(client, 'inventaire@example.test', 'HarvestTest AppareilA')
    await login(client, 'inventaire@example.test', 'HarvestTest AppareilB')

    const liste = await sessions(client, a.accessToken.value)

    assert.lengthOf(liste, 2)
    assert.lengthOf(
      liste.filter((s) => s.current),
      1
    )

    const courante = requis(
      liste.find((s) => s.current),
      'session courante'
    )
    assert.include(courante.userAgent ?? '', 'AppareilA')
    assert.isNotNull(courante.startedAt)
    assert.isNotNull(courante.lastSeenAt)
  })

  test('une rotation ne crée pas de seconde session', async ({ client, assert }) => {
    const a = await signup(client, 'rotation-session@example.test', 'HarvestTest AppareilA')
    const avant = await sessions(client, a.accessToken.value)

    const rafraichi = await client
      .post('/api/v1/auth/refresh')
      .header('user-agent', 'HarvestTest AppareilA')
      .json({ refreshToken: a.refreshToken.value })

    const apres = await sessions(client, rafraichi.body().data.accessToken.value)

    assert.lengthOf(apres, 1)
    assert.equal(apres[0].id, avant[0].id, 'la session doit rester la même')
  })
})

test.group('Sessions — révocation', () => {
  test("révoquer une session tue aussi ses jetons d'accès", async ({ client, assert }) => {
    const a = await signup(client, 'revocation@example.test', 'HarvestTest AppareilA')
    const b = await login(client, 'revocation@example.test', 'HarvestTest AppareilB')

    const liste = await sessions(client, a.accessToken.value)
    const autre = requis(
      liste.find((s) => !s.current),
      'session de l’autre appareil'
    )

    const suppression = await client
      .delete(`/api/v1/account/sessions/${autre.id}`)
      .bearerToken(a.accessToken.value)
    suppression.assertStatus(200)

    const rafraichir = await client
      .post('/api/v1/auth/refresh')
      .json({ refreshToken: b.refreshToken.value })
    rafraichir.assertStatus(401)

    /**
     * Sans suppression des jetons d'accès, la session disparaîtrait de la
     * liste tout en restant utilisable jusqu'à son expiration : fermée en
     * apparence, ouverte en fait.
     */
    const profil = await client.get('/api/v1/account/profile').bearerToken(b.accessToken.value)
    profil.assertStatus(401)

    assert.lengthOf(await sessions(client, a.accessToken.value), 1)
  })

  test('« déconnecter les autres » épargne l’appareil qui demande', async ({ client, assert }) => {
    const a = await signup(client, 'autres@example.test', 'HarvestTest AppareilA')
    await login(client, 'autres@example.test', 'HarvestTest AppareilB')
    await login(client, 'autres@example.test', 'HarvestTest AppareilC')

    assert.lengthOf(await sessions(client, a.accessToken.value), 3)

    const response = await client
      .post('/api/v1/account/sessions/revoke-others')
      .bearerToken(a.accessToken.value)
    response.assertStatus(200)
    assert.equal(response.body().data.revoked, 2)

    const restantes = await sessions(client, a.accessToken.value)
    assert.lengthOf(restantes, 1)
    assert.isTrue(restantes[0].current)
  })
})

test.group('Sessions — cloisonnement entre comptes', () => {
  test('la session d’autrui est introuvable, pas interdite', async ({ client, assert }) => {
    const victime = await signup(client, 'victime@example.test', 'HarvestTest Victime')
    const intrus = await signup(client, 'intrus@example.test', 'HarvestTest Intrus')

    const [laSienne] = await sessions(client, victime.accessToken.value)

    const tentative = await client
      .delete(`/api/v1/account/sessions/${laSienne.id}`)
      .bearerToken(intrus.accessToken.value)

    /**
     * 404 et non 403 : répondre « interdit » confirmerait que la session
     * existe, ce qui est déjà une fuite.
     */
    tentative.assertStatus(404)

    assert.lengthOf(await sessions(client, victime.accessToken.value), 1)
  })

  test('chacun ne voit que ses propres sessions', async ({ client, assert }) => {
    await signup(client, 'cloison-a@example.test', 'HarvestTest A')
    const b = await signup(client, 'cloison-b@example.test', 'HarvestTest B')

    const vueDeB = await sessions(client, b.accessToken.value)

    assert.lengthOf(vueDeB, 1)
    assert.include(vueDeB[0].userAgent ?? '', 'HarvestTest B')
  })

  test('un identifiant qui n’est pas un UUID est rejeté proprement', async ({ client }) => {
    const a = await signup(client, 'uuid@example.test', 'HarvestTest A')

    const response = await client
      .delete('/api/v1/account/sessions/pas-un-uuid')
      .bearerToken(a.accessToken.value)

    /**
     * `family_id` est une colonne uuid : sans validation, Postgres lèverait
     * une erreur et l'API répondrait 500 là où un 422 est attendu.
     */
    response.assertStatus(422)
  })
})
