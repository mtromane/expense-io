import { randomUUID } from 'node:crypto'
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test'
import { receipt, type ReceiptFile } from './files'

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export interface ExpenseNoteDto {
  id: string
  userId: string
  amount: number
  expenseDate: string
  description: string
  receiptKey: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface NoteInput {
  amount?: string
  expenseDate?: string
  description?: string
  /** `null` = pas de fichier envoyé. */
  receipt?: ReceiptFile | null
}

export function uniqueDescription(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

export function postNote(ctx: APIRequestContext, input: NoteInput = {}): Promise<APIResponse> {
  const multipart: Record<string, string | ReceiptFile> = {
    amount: input.amount ?? '42.50',
    expenseDate: input.expenseDate ?? '2026-03-12',
    description: input.description ?? uniqueDescription('Note'),
  }
  const file = input.receipt === undefined ? receipt('png') : input.receipt
  if (file) multipart.receipt = file
  return ctx.post('/api/expense-notes', { multipart })
}

export async function createNote(ctx: APIRequestContext, input: NoteInput = {}): Promise<ExpenseNoteDto> {
  const res = await postNote(ctx, input)
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as ExpenseNoteDto
}

export async function listOwnNotes(ctx: APIRequestContext): Promise<ExpenseNoteDto[]> {
  const res = await ctx.get('/api/expense-notes')
  expect(res.status()).toBe(200)
  return (await res.json()) as ExpenseNoteDto[]
}
