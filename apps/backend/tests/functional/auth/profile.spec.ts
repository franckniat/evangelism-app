import { test } from '@japa/runner'

/**
 * Le profil : le nom affiché et l'église de rattachement.
 *
 * Ce qui est vérifié ici n'est pas tant ce que la route change que ce
 * qu'elle refuse de changer — l'adresse et le mot de passe déplacent
 * l'identité du compte et n'ont rien à faire dans un PATCH sans
 * vérification.
 */

const password = 'motdepasse-de-test'

function corps<T>(response: { body(): unknown }) {
  return response.body() as { data: T }
}

type Profil = { fullName: string | null; email: string; church: string | null }

test.group('Profil', () => {
  test('l église choisie à l inscription est conservée', async ({ client, assert }) => {
    const inscription = await client.post('/api/v1/auth/signup').json({
      fullName: 'Jean Kamga',
      email: 'eglise@example.test',
      password,
      passwordConfirmation: password,
      church: 'Assemblée de Bonabéri',
    })

    inscription.assertStatus(200)
    const token = corps<{ accessToken: { value: string } }>(inscription).data.accessToken.value

    const profil = await client.get('/api/v1/account/profile').bearerToken(token)
    assert.equal(corps<Profil>(profil).data.church, 'Assemblée de Bonabéri')
  })

  test('le nom et l église se modifient, l adresse non', async ({ client, assert }) => {
    const inscription = await client.post('/api/v1/auth/signup').json({
      fullName: 'Nom Initial',
      email: 'modif@example.test',
      password,
      passwordConfirmation: password,
    })
    const token = corps<{ accessToken: { value: string } }>(inscription).data.accessToken.value

    const patch = await client
      .patch('/api/v1/account/profile')
      .bearerToken(token)
      .json({ fullName: 'Nom Corrigé', church: 'Bethel', email: 'usurpe@example.test' })

    patch.assertStatus(200)

    const profil = corps<Profil>(
      await client.get('/api/v1/account/profile').bearerToken(token)
    ).data

    assert.equal(profil.fullName, 'Nom Corrigé')
    assert.equal(profil.church, 'Bethel')
    assert.equal(profil.email, 'modif@example.test', "l'adresse ne doit pas bouger")
  })

  test('modifier son profil demande un jeton', async ({ client }) => {
    const response = await client.patch('/api/v1/account/profile').json({ fullName: 'Anonyme' })
    response.assertStatus(401)
  })
})
