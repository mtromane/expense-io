import bcrypt from 'bcryptjs'
import type { PasswordHasher } from '../ports/PasswordHasher'

/** bcrypt, coût 12 comme avant la refacto (les hachages existants restent vérifiables). */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost = 12) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.cost)
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash)
  }
}
