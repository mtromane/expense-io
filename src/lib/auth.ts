import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { readAuthSecret } from '@/config'
import { getPool } from '@/lib/db'

// Secret lu dans AUTH_SECRET (SEC-04), jamais écrit dans le code. Sa présence
// est imposée au démarrage du serveur (src/instrumentation.ts) ; il reste
// facultatif ici pour que `next build` n'en dépende pas.
export const { handlers, auth, signIn, signOut } = NextAuth({
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
        const password =
          typeof credentials?.password === 'string' ? credentials.password : null
        if (!email || !password) return null

        const result = await getPool().query<{
          id: string
          email: string
          password_hash: string
          role: 'employee' | 'manager' | 'hr_admin'
        }>('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email])
        const user = result.rows[0]
        if (!user) return null

        const passwordMatches = await bcrypt.compare(password, user.password_hash)
        if (!passwordMatches) return null

        return { id: user.id, email: user.email, role: user.role }
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
        session.user.role = token.role as 'employee' | 'manager' | 'hr_admin'
      }
      return session
    },
  },
})
