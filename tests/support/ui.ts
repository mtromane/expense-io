import { randomUUID } from 'node:crypto'
import { expect, type Page } from '@playwright/test'
import type { Credentials } from './auth'

export function uniqueDomain(): string {
  return `t-${randomUUID().slice(0, 8)}.test`
}

export async function loginUI(page: Page, creds: Credentials): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(creds.email)
  await page.getByLabel('Mot de passe').fill(creds.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/expenses$/)
}

export async function signupUI(page: Page, input: { name: string; email: string; password: string }): Promise<void> {
  await page.goto('/signup')
  await page.getByLabel('Nom').fill(input.name)
  await page.getByLabel('Email').fill(input.email)
  await page.getByLabel('Mot de passe').fill(input.password)
  await page.getByRole('button', { name: "S'inscrire" }).click()
}
