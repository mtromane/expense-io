import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { UserRole } from '@/domain/User'
import { readAuthSecret } from '@/config'
import type { AuthenticatedUser } from '../application/authenticate'

/**
 * Adapter Auth.js : session JWT, connexion par identifiants déléguée au cas
 * d'usage `authenticate`. Secret lu dans AUTH_SECRET (SEC-04), jamais écrit
 * dans le code. Sa présence est imposée au démarrage du serveur
 * (src/instrumentation.ts) ; il reste facultatif ici pour que `next build`
 * n'en dépende pas.
 */
export function makeAuthJs(authenticate: (email: string, password: string) => Promise<AuthenticatedUser | null>) {
  return NextAuth({
    secret: readAuthSecret(),
    session: { strategy: 'jwt' },
    pages: {
      signIn: '/login',
    },
    providers: [
      Credentials({
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Mot de passe', type: 'password' },
        },
        async authorize(credentials) {
          const email = typeof credentials?.email === 'string' ? credentials.email : null
          const password = typeof credentials?.password === 'string' ? credentials.password : null
          if (!email || !password) return null
          return authenticate(email, password)
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id
          token.role = user.role
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string
          session.user.role = token.role as UserRole
        }
        return session
      },
    },
  })
}
