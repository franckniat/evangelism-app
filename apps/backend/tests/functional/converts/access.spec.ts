import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'

/**
 * Le critère de sortie du domaine : personne n'atteint le dossier d'un autre.
 *
 * Un dossier de suivi porte un nom, un numéro et un positionnement religieux
 * sur une personne qui n'a jamais ouvert de compte. Une fuite ici n'est pas
 * un désagrément, c'est la chose qu'il faut empêcher.
 *
 * Ces tests interrogent les routes HTTP, pas les politiques : c'est par une
 * route oubliée qu'une faille arrive, jamais par une politique qu'on a pensé
 * à écrire.
 */

const password = 'motdepasse-de-test'

/**
 * Le registre typé de Tuyau expose une union de toutes les réponses
 * possibles d'une route, que TypeScript ne sait pas réduire ici. On désigne
 * donc explicitement la forme attendue, à l'endroit où on la lit — plutôt
 * qu'un `any` qui désarmerait la vérification partout.
 */
function corps<T>(response: { body(): unknown }) {
  return response.body() as { data: T }
}

type Fil = { events: { type: string; text: string | null }[] }
type Dossier = {
  id: string
  firstName: string
  shortName: string
  hasConsented: boolean
  nextVisitAt: string | null
}

async function compte(client: ApiClient, email: string) {
  const response = await client
    .post('/api/v1/auth/signup')
    .json({ fullName: 'Évangéliste', email, password, passwordConfirmation: password })

  response.assertStatus(200)
  return corps<{ accessToken: { value: string } }>(response).data.accessToken.value
}

async function creerDossier(client: ApiClient, token: string, prenom = 'Marie') {
  const response = await client
    .post('/api/v1/converts')
    .bearerToken(token)
    .json({ firstName: prenom, phone: '+237600000001', consented: true })

  response.assertStatus(201)
  return corps<Dossier>(response).data
}

test.group('Dossiers — le sien', () => {
  test('créer un dossier le rend visible à son auteur, avec son consentement', async ({
    client,
    assert,
  }) => {
    const token = await compte(client, 'sien@example.test')
    const dossier = await creerDossier(client, token, 'Esther')

    assert.equal(dossier.firstName, 'Esther')
    assert.isTrue(dossier.hasConsented, 'le consentement doit être horodaté')

    const liste = await client.get('/api/v1/converts').bearerToken(token)
    liste.assertStatus(200)
    assert.lengthOf(corps<{ converts: Dossier[] }>(liste).data.converts, 1)
  })

  test('un dossier sans aucun moyen de contact est refusé', async ({ client }) => {
    const token = await compte(client, 'sans-contact@example.test')

    const response = await client
      .post('/api/v1/converts')
      .bearerToken(token)
      .json({ firstName: 'Anonyme' })

    /**
     * Sans téléphone ni courriel, le suivi est précisément ce qu'on ne
     * pourra pas faire.
     */
    response.assertStatus(422)
  })

  test('le nom court ne révèle que le prénom et une initiale', async ({ client, assert }) => {
    const token = await compte(client, 'nom-court@example.test')

    const response = await client
      .post('/api/v1/converts')
      .bearerToken(token)
      .json({ firstName: 'Jean', lastName: 'Mbarga', phone: '+237600000002', consented: true })

    assert.equal(corps<Dossier>(response).data.shortName, 'Jean M.')
  })
})

test.group('Dossiers — cloisonnement entre évangélistes', () => {
  test('la liste ne montre jamais les dossiers d un autre', async ({ client, assert }) => {
    const moi = await compte(client, 'moi@example.test')
    const autre = await compte(client, 'autre@example.test')

    await creerDossier(client, moi, 'MonContact')
    await creerDossier(client, autre, 'SonContact')

    const maListe = await client.get('/api/v1/converts').bearerToken(moi)
    const dossiers = corps<{ converts: Dossier[] }>(maListe).data.converts

    assert.lengthOf(dossiers, 1)
    assert.equal(dossiers[0].firstName, 'MonContact')
  })

  test('consulter le dossier d un autre répond « introuvable »', async ({ client }) => {
    const moi = await compte(client, 'lecture-moi@example.test')
    const autre = await compte(client, 'lecture-autre@example.test')
    const sien = await creerDossier(client, autre)

    const response = await client.get(`/api/v1/converts/${sien.id}`).bearerToken(moi)

    /**
     * 404 et non 403 : répondre « interdit » confirmerait que ce dossier
     * existe, ce qui est déjà une information sur une personne.
     */
    response.assertStatus(404)
  })

  test('modifier le dossier d un autre est sans effet', async ({ client, assert }) => {
    const moi = await compte(client, 'ecriture-moi@example.test')
    const autre = await compte(client, 'ecriture-autre@example.test')
    const sien = await creerDossier(client, autre, 'Intact')

    const tentative = await client
      .patch(`/api/v1/converts/${sien.id}`)
      .bearerToken(moi)
      .json({ firstName: 'Modifié', status: 'baptise' })

    tentative.assertStatus(404)

    const verification = await client.get(`/api/v1/converts/${sien.id}`).bearerToken(autre)
    assert.equal(corps<{ convert: Dossier }>(verification).data.convert.firstName, 'Intact')
  })

  test('supprimer le dossier d un autre est sans effet', async ({ client, assert }) => {
    const moi = await compte(client, 'suppr-moi@example.test')
    const autre = await compte(client, 'suppr-autre@example.test')
    const sien = await creerDossier(client, autre)

    const tentative = await client.delete(`/api/v1/converts/${sien.id}`).bearerToken(moi)
    tentative.assertStatus(404)

    const liste = await client.get('/api/v1/converts').bearerToken(autre)
    assert.lengthOf(corps<{ converts: Dossier[] }>(liste).data.converts, 1)
  })

  test('ajouter une note au dossier d un autre est refusé', async ({ client }) => {
    const moi = await compte(client, 'note-moi@example.test')
    const autre = await compte(client, 'note-autre@example.test')
    const sien = await creerDossier(client, autre)

    const response = await client
      .post(`/api/v1/converts/${sien.id}/notes`)
      .bearerToken(moi)
      .json({ text: 'note indiscrète' })

    response.assertStatus(404)
  })

  test('planifier une visite chez le contact d un autre est refusé', async ({ client }) => {
    const moi = await compte(client, 'visite-moi@example.test')
    const autre = await compte(client, 'visite-autre@example.test')
    const sien = await creerDossier(client, autre)

    const response = await client
      .post('/api/v1/visits')
      .bearerToken(moi)
      .json({ convertId: sien.id, scheduledAt: new Date(Date.now() + 86400000).toISOString() })

    response.assertStatus(404)
  })

  test('les secteurs sont cloisonnés eux aussi', async ({ client, assert }) => {
    const moi = await compte(client, 'secteur-moi@example.test')
    const autre = await compte(client, 'secteur-autre@example.test')

    const sien = await client
      .post('/api/v1/sectors')
      .bearerToken(autre)
      .json({ name: 'Bonabéri', city: 'Douala' })
    sien.assertStatus(201)

    const maListe = await client.get('/api/v1/sectors').bearerToken(moi)
    assert.lengthOf(corps<{ sectors: { id: string }[] }>(maListe).data.sectors, 0)

    const idSecteur = corps<{ id: string }>(sien).data.id
    const tentative = await client.delete(`/api/v1/sectors/${idSecteur}`).bearerToken(moi)
    tentative.assertStatus(404)
  })

  test('aucune route métier n est accessible sans jeton', async ({ client }) => {
    for (const chemin of ['/api/v1/converts', '/api/v1/sectors', '/api/v1/visits']) {
      const response = await client.get(chemin)
      response.assertStatus(401)
    }
  })
})

test.group('Suivi — le travail du jour', () => {
  test('une visite planifiée remonte dans l agenda et dans le dossier', async ({
    client,
    assert,
  }) => {
    const token = await compte(client, 'agenda@example.test')
    const dossier = await creerDossier(client, token, 'Paul')
    const demain = new Date(Date.now() + 86400000).toISOString()

    const visite = await client
      .post('/api/v1/visits')
      .bearerToken(token)
      .json({ convertId: dossier.id, scheduledAt: demain })
    visite.assertStatus(201)

    const agenda = await client.get('/api/v1/visits?scope=upcoming').bearerToken(token)
    const visites = agenda.body().data.visits

    assert.lengthOf(visites, 1)
    assert.equal(visites[0].convert.shortName, 'Paul')

    /**
     * La prochaine visite est calculée à partir des visites, jamais stockée
     * sur le dossier : une valeur dupliquée finit toujours par diverger.
     */
    const liste = await client.get('/api/v1/converts').bearerToken(token)
    assert.isNotNull(
      corps<{ converts: { nextVisitAt: string | null }[] }>(liste).data.converts[0].nextVisitAt
    )
  })

  test('marquer une visite effectuée l inscrit au fil du dossier', async ({ client, assert }) => {
    const token = await compte(client, 'effectuee@example.test')
    const dossier = await creerDossier(client, token)

    const visite = await client
      .post('/api/v1/visits')
      .bearerToken(token)
      .json({ convertId: dossier.id, scheduledAt: new Date().toISOString() })

    const close = await client
      .patch(`/api/v1/visits/${corps<{ id: string }>(visite).data.id}`)
      .bearerToken(token)
      .json({ status: 'done', report: 'Bon accueil, à revoir dans deux semaines' })
    close.assertStatus(200)

    const fiche = await client.get(`/api/v1/converts/${dossier.id}`).bearerToken(token)
    const types = corps<Fil>(fiche).data.events.map((e) => e.type)

    assert.include(types, 'visit_done')
    assert.include(types, 'created')
  })

  test('changer le statut laisse une trace datée', async ({ client, assert }) => {
    const token = await compte(client, 'statut@example.test')
    const dossier = await creerDossier(client, token)

    await client
      .patch(`/api/v1/converts/${dossier.id}`)
      .bearerToken(token)
      .json({ status: 'sauve' })

    const fiche = await client.get(`/api/v1/converts/${dossier.id}`).bearerToken(token)
    const trace = corps<Fil>(fiche).data.events.find((e) => e.type === 'status_changed')

    assert.exists(trace, 'le changement de statut doit apparaître dans le fil')
    assert.include(trace?.text ?? '', 'sauve')
  })
})
