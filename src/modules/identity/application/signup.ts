import { isPublicEmailDomain, PUBLIC_DOMAIN_REFUSED } from '../domain/PublicEmailDomains'
import { EMAIL_TAKEN, INVALID_SIGNUP, parseSignupForm, roleOfNewMember, type SignupInput } from '../domain/SignupForm'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { UserRepository } from '../ports/UserRepository'

/** Compte créé (identifiants à utiliser pour la connexion automatique), ou message pour le formulaire. */
export type SignupResult = { ok: true; email: string; password: string } | { ok: false; error: string }

/**
 * Inscription : le premier compte d'un domaine crée l'entreprise et en devient
 * la RH, les suivants rejoignent l'entreprise comme employés. Les domaines de
 * messagerie publics sont refusés (D16, ADR-016).
 */
export function makeSignup(deps: { users: UserRepository; hasher: PasswordHasher }) {
  return async (input: SignupInput): Promise<SignupResult> => {
    const form = parseSignupForm(input)
    if (!form) return { ok: false, error: INVALID_SIGNUP }
    if (isPublicEmailDomain(form.emailDomain)) return { ok: false, error: PUBLIC_DOMAIN_REFUSED }
    if (await deps.users.emailExists(form.email)) return { ok: false, error: EMAIL_TAKEN }

    const company = await deps.users.claimCompany(form.companyName, form.emailDomain)
    const passwordHash = await deps.hasher.hash(form.password)
    await deps.users.createUser({
      name: form.name,
      email: form.email,
      passwordHash,
      companyId: company.companyId,
      role: roleOfNewMember(company.created),
    })
    return { ok: true, email: form.email, password: form.password }
  }
}
