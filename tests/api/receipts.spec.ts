import { expect, request, test } from '@playwright/test'
import { loginAs } from '../support/auth'
import { receipt } from '../support/files'
import { createNote } from '../support/notes'

async function download(url: string) {
  const ctx = await request.newContext()
  const res = await ctx.get(url)
  const result = { status: res.status(), body: await res.body(), type: res.headers()['content-type'] }
  await ctx.dispose()
  return result
}

test.describe('RCPT — URLs de reçu', { tag: '@parity' }, () => {
  test('employé : URL du reçu → mêmes octets et content-type', async () => {
    const emp = await loginAs('empA1')
    const file = receipt('jpg')
    const note = await createNote(emp, { receipt: file })
    const res = await emp.get(`/api/expense-notes/${note.id}/receipt-url`)
    expect(res.status()).toBe(200)
    const { url } = (await res.json()) as { url: string }
    const downloaded = await download(url)
    expect(downloaded.status).toBe(200)
    expect(downloaded.type).toBe('image/jpeg')
    expect(downloaded.body.equals(file.buffer)).toBe(true)
    await emp.dispose()
  })

  test('employé : reçu de la note d’un autre → 404', async () => {
    const owner = await loginAs('empA1')
    const other = await loginAs('empA2')
    const note = await createNote(owner)
    const res = await other.get(`/api/expense-notes/${note.id}/receipt-url`)
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
    await Promise.all([owner.dispose(), other.dispose()])
  })

  test('manager direct : URL du reçu d’un rattaché', async () => {
    const emp = await loginAs('empA1')
    const mgr = await loginAs('subMgrA')
    const file = receipt('png')
    const note = await createNote(emp, { receipt: file })
    const res = await mgr.get(`/api/manager/expense-notes/${note.id}/receipt-url`)
    expect(res.status()).toBe(200)
    const downloaded = await download(((await res.json()) as { url: string }).url)
    expect(downloaded.body.equals(file.buffer)).toBe(true)
    await Promise.all([emp.dispose(), mgr.dispose()])
  })

  test('RH : URL du reçu d’une note de manager racine', async () => {
    const root = await loginAs('rootMgrA')
    const hr = await loginAs('hrA')
    const file = receipt('webp')
    const note = await createNote(root, { receipt: file })
    const res = await hr.get(`/api/hr/expense-notes/${note.id}/receipt-url`)
    expect(res.status()).toBe(200)
    const downloaded = await download(((await res.json()) as { url: string }).url)
    expect(downloaded.type).toBe('image/webp')
    expect(downloaded.body.equals(file.buffer)).toBe(true)
    await Promise.all([root.dispose(), hr.dispose()])
  })
})
