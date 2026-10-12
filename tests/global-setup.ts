import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

export default function globalSetup() {
  if (existsSync('scripts/seed-e2e.mjs')) {
    execFileSync('node', ['scripts/seed-e2e.mjs'], { stdio: 'inherit' })
  }
}
