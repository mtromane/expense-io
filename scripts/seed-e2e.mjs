// Crée les acteurs de test décrits dans tests/fixtures/dataset.json
// (entreprises, utilisateurs, hiérarchie) — jamais de notes : chaque test
// crée les siennes via l'API. Idempotent : chaque exécution remet la
// hiérarchie dans l'état du dataset.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import bcrypt from 'bcryptjs'
import { config as loadEnv } from 'dotenv'
import { Pool } from 'pg'

loadEnv({ quiet: true })

const dataset = JSON.parse(
  readFileSync(new URL('../tests/fixtures/dataset.json', import.meta.url), 'utf8')
)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
// Coût bcrypt réduit : comptes de test uniquement, la vérification au login
// fonctionne quel que soit le coût.
const passwordHash = await bcrypt.hash(dataset.password, 4)

function emailFor(userKey, domain) {
  return `${userKey.toLowerCase()}@${domain}`
}

try {
  const actors = {}
  const pendingManagers = []

  for (const company of dataset.companies) {
    const companyResult = await pool.query(
      `INSERT INTO companies (name, email_domain) VALUES ($1, $2)
       ON CONFLICT (email_domain) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [company.key, company.domain]
    )
    const companyId = companyResult.rows[0].id

    for (const user of company.users) {
      const email = emailFor(user.key, company.domain)
      const userResult = await pool.query(
        `INSERT INTO users (email, name, password_hash, role, company_id, manager_id)
         VALUES ($1, $2, $3, $4, $5, NULL)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           company_id = EXCLUDED.company_id,
           manager_id = NULL
         RETURNING id`,
        [email, user.name, passwordHash, user.role, companyId]
      )
      actors[user.key] = {
        key: user.key,
        id: userResult.rows[0].id,
        email,
        name: user.name,
        role: user.role,
        company: company.key,
      }
      if (user.manager) pendingManagers.push([user.key, user.manager])
    }
  }

  for (const [userKey, managerKey] of pendingManagers) {
    await pool.query('UPDATE users SET manager_id = $1 WHERE id = $2', [
      actors[managerKey].id,
      actors[userKey].id,
    ])
  }

  mkdirSync(new URL('../tests/.generated/', import.meta.url), { recursive: true })
  writeFileSync(
    new URL('../tests/.generated/actors.json', import.meta.url),
    JSON.stringify(actors, null, 2)
  )
  console.log(`seed-e2e : ${Object.keys(actors).length} acteurs prêts.`)
} finally {
  await pool.end()
}
