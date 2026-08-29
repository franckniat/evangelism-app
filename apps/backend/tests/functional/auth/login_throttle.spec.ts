import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

/**
 * Couvre le comptage des échecs de connexion, par compte.
 *
 * Les limites par adresse IP sont désactivées en test (voir
 * `start/limiter.ts`) : elles ne sont pas vérifiables quand tous les tests
 * sortent de la même adresse. Celle-ci ne dépend d'aucune IP et reste donc
 * active — c'est aussi la seule des deux qui protège réellement un compte.
 */

const password = 'motdepasse-de-test'
const mauvais = 'ce-n-est-pas-le-bon'

async function creerCompte(client: ApiClient, email: string) {
  const response = await client
    .post('/api/v1/auth/signup')
    .json({ fullName: 'Compte', email, password, passwordConfirmation: password })

  response.assertStatus(200)
}

function seConnecter(client: ApiClient, email: string, motDePasse: string) {
  return client.post('/api/v1/auth/login').json({ email, password: motDePasse })
}

test.group('Connexion — verrouillage par compte', () => {
  test('cinq échecs sont tolérés, le sixième verrouille', async ({ client, assert }) => {
    const email = 'verrou@example.test'
    await creerCompte(client, email)

    const codes: number[] = []
    for (let i = 0; i < 6; i++) {
      const response = await seConnecter(client, email, mauvais)
      codes.push(response.status())
    }

    assert.notInclude(codes.slice(0, 5), 429, 'les cinq premiers doivent être des refus normaux')
    assert.equal(codes[5], 429, 'le sixième doit être bloqué')
  })

  test('une fois verrouillé, le bon mot de passe est refusé aussi', async ({ client }) => {
    const email = 'verrou-bon@example.test'
    await creerCompte(client, email)

    for (let i = 0; i < 6; i++) {
      await seConnecter(client, email, mauvais)
    }

    const avecLeBon = await seConnecter(client, email, password)
    avecLeBon.assertStatus(429)
  })

  test('une connexion réussie remet le compteur à zéro', async ({ client }) => {
    const email = 'remise-a-zero@example.test'
    await creerCompte(client, email)

    for (let i = 0; i < 3; i++) {
      await seConnecter(client, email, mauvais)
    }

    const reussie = await seConnecter(client, email, password)
    reussie.assertStatus(200)

    /**
     * Sans remise à zéro, ces quatre échecs s'ajouteraient aux trois
     * précédents et la connexion suivante serait bloquée. Une personne qui
     * se trompe épisodiquement ne doit jamais être gênée.
     */
    for (let i = 0; i < 4; i++) {
      await seConnecter(client, email, mauvais)
    }

    const encore = await seConnecter(client, email, password)
    encore.assertStatus(200)
  })

  test('le verrouillage ne déborde pas sur un autre compte', async ({ client }) => {
    const victime = 'cible@example.test'
    const voisin = 'voisin@example.test'
    await creerCompte(client, victime)
    await creerCompte(client, voisin)

    for (let i = 0; i < 6; i++) {
      await seConnecter(client, victime, mauvais)
    }

    const bloquee = await seConnecter(client, victime, password)
    bloquee.assertStatus(429)

    const intacte = await seConnecter(client, voisin, password)
    intacte.assertStatus(200)
  })
})
