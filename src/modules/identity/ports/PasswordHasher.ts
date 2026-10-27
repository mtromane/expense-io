/** Hachage des mots de passe : seul l'adapter connaît l'algorithme et son coût. */
export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, passwordHash: string): Promise<boolean>
}
