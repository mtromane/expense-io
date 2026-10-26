import { describe, expect, it } from 'vitest'
import { makeAuthenticate } from '@/modules/identity/application/authenticate'
import { makeResolveActor } from '@/modules/identity/application/resolveActor'
import { makeSignup } from '@/modules/identity/application/signup'
import { PUBLIC_DOMAIN_REFUSED } from '@/modules/identity/domain/PublicEmailDomains'
import { EMAIL_TAKEN, INVALID_SIGNUP } from '@/modules/identity/domain/SignupForm'
import type { PasswordHasher } from '@/modules/identity/ports/PasswordHasher'
import type { NewUser, UserCredentials, UserRepository } from '@/modules/identity/ports/UserRepository'

/**
 * Cas d'usage signup et authenticate avec des comptes en mémoire et un
 * hachage factice : règles de l'inscription (entreprise déduite du domaine,
 * premier inscrit RH), mot de passe jamais stocké en clair, même réponse pour
 * un email inconnu et un mot de passe faux.
 */

class InMemoryUsers implements UserRepository {
  companies = new Map<string, { id: string; name: string }>()
  users: (NewUser & { id: string })[] = []

  async findCredentials(email: string): Promise<UserCredentials | null> {
    const user = this.users.find((u) => u.email === email)
    return user ? { id: user.id, email: user.email, passwordHash: user.passwordHash, role: user.role } : null
  }

  async findActor(id: string) {
    const user = this.users.find((u) => u.id === id)
    return user ? { id: user.id, role: user.role } : null
  }

  async emailExists(email: string) {
    return this.users.some((u) => u.email === email)
  }

  async claimCompany(name: string, emailDomain: string) {
    const existing = this.companies.get(emailDomain)
    if (existing) return { companyId: existing.id, created: false }
    const id = `company-${this.companies.size + 1}`
    this.companies.set(emailDomain, { id, name })
    return { companyId: id, created: true }
  }

  async createUser(user: NewUser) {
    this.users.push({ ...user, id: `user-${this.users.length + 1}` })
  }
}

const hasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  verify: async (password, passwordHash) => passwordHash === `hashed:${password}`,
}

function setup() {
  const users = new InMemoryUsers()
  return { users, signup: makeSignup({ users, hasher }), authenticate: makeAuthenticate({ users, hasher }) }
}

const FORM = { name: '  Alice ', email: 'alice@Acme.io', password: 'motdepasse1' }

describe('signup', () => {
  it('le premier inscrit crée l’entreprise du domaine et en devient la RH', async () => {
    const { users, signup } = setup()
    expect(await signup(FORM)).toEqual({ ok: true, email: 'alice@Acme.io', password: 'motdepasse1' })
    expect(users.companies.get('acme.io')).toEqual({ id: 'company-1', name: 'acme' })
    expect(users.users[0]).toMatchObject({ name: 'Alice', email: 'alice@Acme.io', companyId: 'company-1', role: 'hr_admin' })
  })

  it('les inscrits suivants du domaine rejoignent l’entreprise comme employés', async () => {
    const { users, signup } = setup()
    await signup(FORM)
    await signup({ ...FORM, email: 'bob@acme.io' })
    expect(users.companies.size).toBe(1)
    expect(users.users[1]).toMatchObject({ companyId: 'company-1', role: 'employee' })
  })

  it('ne stocke jamais le mot de passe en clair', async () => {
    const { users, signup } = setup()
    await signup(FORM)
    expect(users.users[0].passwordHash).toBe('hashed:motdepasse1')
  })

  it('refuse un email déjà inscrit sans rien créer', async () => {
    const { users, signup } = setup()
    await signup(FORM)
    expect(await signup({ ...FORM, name: 'Autre' })).toEqual({ ok: false, error: EMAIL_TAKEN })
    expect(users.users).toHaveLength(1)
  })

  for (const [label, input] of [
    ['nom vide', { ...FORM, name: '   ' }],
    ['email sans domaine', { ...FORM, email: 'alice@acme' }],
    ['mot de passe de 7 caractères', { ...FORM, password: '1234567' }],
    ['champ absent', { ...FORM, password: null }],
  ] as const) {
    it(`refuse un formulaire invalide (${label}) sans rien créer`, async () => {
      const { users, signup } = setup()
      expect(await signup(input)).toEqual({ ok: false, error: INVALID_SIGNUP })
      expect(users.users).toHaveLength(0)
      expect(users.companies.size).toBe(0)
    })
  }
})

describe('signup : domaines publics (D16, MET-01)', () => {
  for (const email of ['alice@gmail.com', 'bob@Outlook.FR', 'carole@orange.fr']) {
    it(`${email} refusé, rien n’est créé`, async () => {
      const { users, signup } = setup()
      expect(await signup({ ...FORM, email })).toEqual({ ok: false, error: PUBLIC_DOMAIN_REFUSED })
      expect(users.users).toHaveLength(0)
      expect(users.companies.size).toBe(0)
    })
  }

  it('un domaine d’entreprise reste accepté', async () => {
    const { signup } = setup()
    expect((await signup({ ...FORM, email: 'alice@acme-gmail.com' })).ok).toBe(true)
  })
})

describe('authenticate', () => {
  it('renvoie l’acteur pour des identifiants valides', async () => {
    const { signup, authenticate } = setup()
    await signup(FORM)
    expect(await authenticate('alice@Acme.io', 'motdepasse1')).toEqual({
      id: 'user-1',
      email: 'alice@Acme.io',
      role: 'hr_admin',
    })
  })

  it('même réponse pour un email inconnu et un mot de passe faux', async () => {
    const { signup, authenticate } = setup()
    await signup(FORM)
    expect(await authenticate('inconnu@acme.io', 'motdepasse1')).toBeNull()
    expect(await authenticate('alice@Acme.io', 'mauvais-mot')).toBeNull()
  })
})

describe('resolveActor (V-19, D14)', () => {
  it('rôle relu en base : un changement de rôle s’applique sans reconnexion', async () => {
    const { users, signup } = setup()
    await signup(FORM)
    const resolveActor = makeResolveActor({ users })
    expect(await resolveActor('user-1')).toEqual({ id: 'user-1', role: 'hr_admin' })
    users.users[0].role = 'employee'
    expect(await resolveActor('user-1')).toEqual({ id: 'user-1', role: 'employee' })
  })

  it('sans session ou compte supprimé → aucun acteur', async () => {
    const { users } = setup()
    const resolveActor = makeResolveActor({ users })
    expect(await resolveActor(null)).toBeNull()
    expect(await resolveActor(undefined)).toBeNull()
    expect(await resolveActor('inconnu')).toBeNull()
  })
})
