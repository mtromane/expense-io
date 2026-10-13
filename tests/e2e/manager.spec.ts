import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { credentialsOf, loginAs } from '../support/auth'
import { createNote, uniqueDescription } from '../support/notes'
import { loginUI } from '../support/ui'

test.describe('E2E-04 — décision du manager visible par l’employé', { tag: '@parity' }, () => {
  for (const [button, label] of [['Approuver', 'approuvée'], ['Rejeter', 'rejetée']] as const) {
    test(`${button} → l’employé voit « ${label} »`, async ({ browser }) => {
      const description = uniqueDescription(`E2E ${button}`)
      const emp = await loginAs('empA1')
      await createNote(emp, { description })
      await emp.dispose()

      const mgrContext = await browser.newContext()
      const mgrPage = await mgrContext.newPage()
      await loginUI(mgrPage, credentialsOf(actor('subMgrA')))
      await mgrPage.goto('/manager')
      const row = mgrPage.getByRole('row').filter({ hasText: description })
      await row.getByRole('button', { name: button }).click()
      await expect(row).toHaveCount(0)
      await mgrContext.close()

      const empContext = await browser.newContext()
      const empPage = await empContext.newPage()
      await loginUI(empPage, credentialsOf(actor('empA1')))
      await expect(empPage.getByRole('row').filter({ hasText: description })).toContainText(label)
      await empContext.close()
    })
  }
})
