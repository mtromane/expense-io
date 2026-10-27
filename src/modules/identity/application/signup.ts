import { isPublicEmailDomain, PUBLIC_DOMAIN_REFUSED } from '../domain/PublicEmailDomains'
import { EMAIL_TAKEN, INVALID_SIGNUP, parseSignupForm, roleOfNewMember, type SignupInput } from '../domain/SignupForm'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { SignupTransaction, UserRepository } from '../ports/UserRepository'

/** Compte créé (identifiants à utiliser pour la connexion automatique), ou message pour le formulaire. */
export type SignupResult = { ok: true; email: string; password: string } | { ok: false; error: string }

/** Email pris par une inscription simultanée : annule la transaction (l'entreprise créée avec). */
class EmailTakenMeanwhile extends Error {}

/**
 * Inscription : le premier compte d'un domaine crée l'entreprise et en devient
 * la RH, les suivants rejoignent l'entreprise comme employés. Les domaines de
 * messagerie publics sont refusés (D16, ADR-016). Entreprise et compte sont
 * créés ensemble ou pas du tout : une inscription simultanée du même email ne
 * laisse pas d'entreprise sans RH (revue de la PR #6).
 */
export function makeSignup(deps: { users: UserRepository; hasher: PasswordHasher; transaction: SignupTransaction }) {
  return async (input: SignupInput): Promise<SignupResult> => {
    const form = parseSignupForm(input)
    if (!form) return { ok: false, error: INVALID_SIGNUP }
    if (isPublicEmailDomain(form.emailDomain)) return { ok: false, error: PUBLIC_DOMAIN_REFUSED }
    if (await deps.users.emailExists(form.email)) return { ok: false, error: EMAIL_TAKEN }

    // Hachage (lent) hors transaction ; entreprise et compte ensuite, ensemble ou pas du tout.
    const passwordHash = await deps.hasher.hash(form.password)
    try {
      await deps.transaction.run(async (users) => {
        const company = await users.claimCompany(form.companyName, form.emailDomain)
        const created = await users.createUser({
          name: form.name,
          email: form.email,
          passwordHash,
          companyId: company.companyId,
          role: roleOfNewMember(company.created),
        })
        if (!created) throw new EmailTakenMeanwhile()
      })
    } catch (error) {
      if (error instanceof EmailTakenMeanwhile) return { ok: false, error: EMAIL_TAKEN }
      throw error
    }
    return { ok: true, email: form.email, password: form.password }
  }
}
