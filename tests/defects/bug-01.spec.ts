import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { credentialsOf, loginAs } from '../support/auth'
import { createNote, uniqueDescription } from '../support/notes'
import { loginUI } from '../support/ui'
import { expectDefect } from './registry'

test.use({ timezoneId: 'America/New_York' })

test('BUG-01 la date saisie s’affiche telle quelle en fuseau négatif', { tag: ['@defect', '@BUG-01'] }, async ({ page }) => {
  const emp = await loginAs('empA1')
  const description = uniqueDescription('Fuseau')
  await createNote(emp, { description, expenseDate: '2026-03-12' })
  await emp.dispose()

  await loginUI(page, credentialsOf(actor('empA1')))
  const row = page.getByRole('row').filter({ hasText: description })
  await expect(row).toBeVisible()
  expectDefect('BUG-01')
  await expect(row).toContainText('12 mars 2026', { timeout: 2_000 })
})
