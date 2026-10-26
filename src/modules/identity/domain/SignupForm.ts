import type { UserRole } from '@/domain/User'

export const MIN_PASSWORD_LENGTH = 8
export const INVALID_SIGNUP = `Nom requis, email invalide, ou mot de passe trop court (${MIN_PASSWORD_LENGTH} caractères minimum).`
export const EMAIL_TAKEN = 'Un compte existe déjà avec cet email.'

const EMAIL_PATTERN = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/

/** Formulaire d'inscription validé ; l'entreprise est déduite du domaine de l'email. */
export interface SignupForm {
  name: string
  email: string
  password: string
  emailDomain: string
  companyName: string
}

export interface SignupInput {
  name: unknown
  email: unknown
  password: unknown
}

/** Formulaire validé, ou null si un champ manque ou est invalide. */
export function parseSignupForm({ name, email, password }: SignupInput): SignupForm | null {
  const emailMatch = typeof email === 'string' ? EMAIL_PATTERN.exec(email) : null
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    !emailMatch ||
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    return null
  }
  const emailDomain = emailMatch[1].toLowerCase()
  return { name: name.trim(), email: emailMatch[0], password, emailDomain, companyName: emailDomain.split('.')[0] }
}

/** Le premier inscrit d'un domaine crée l'entreprise et en devient la RH ; les suivants sont employés. */
export function roleOfNewMember(createdCompany: boolean): Extract<UserRole, 'employee' | 'hr_admin'> {
  return createdCompany ? 'hr_admin' : 'employee'
}
