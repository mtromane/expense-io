import type {
  CompanyUserDto,
  ExpenseNoteDto,
  HrUserDto,
  ReceiptUrlDto,
  SuggestionDto,
} from '@/modules/shared/http/presenters'

/**
 * Client des routes /api pour les écrans. Chaque appel renvoie les données
 * typées par les DTO du contrat, ou le message `error` renvoyé par l'API
 * (absent si le corps n'en contient pas : l'écran affiche alors le sien).
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string }

export type Decision = 'approve' | 'reject'

/**
 * Messages de l'API (en anglais depuis D15, ADR-015) affichés en français à
 * l'écran. Les trois premiers reprennent mot pour mot les textes affichés
 * avant la décision : l'écran ne change pas. Les autres messages de l'API
 * (`Already decided`, `Invalid manager`…) étaient déjà affichés tels quels.
 */
const SCREEN_MESSAGES: Record<string, string> = {
  'Invalid fields': 'Champs invalides',
  'Receipt file type not allowed': 'Type de fichier non autorisé pour le reçu',
  'File too large': 'Fichier trop volumineux',
  'Manager has direct reports': 'Ce manager a encore des subordonnés : réaffectez-les d’abord.',
  'Last HR admin': 'Une entreprise doit garder au moins une RH.',
  'Cannot change own role': 'Vous ne pouvez pas changer votre propre rôle.',
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(url, init)
  if (response.ok) {
    return { ok: true, data: (await response.json()) as T }
  }
  const body = await response.json().catch(() => null)
  const error = typeof body?.error === 'string' ? body.error : undefined
  return { ok: false, error: error && (SCREEN_MESSAGES[error] ?? error) }
}

const putJson = (body: unknown): RequestInit => ({
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const post = { method: 'POST' }

export const employeeApi = {
  listNotes: () => request<ExpenseNoteDto[]>('/api/expense-notes'),
  submitNote: (form: FormData) => request<ExpenseNoteDto>('/api/expense-notes', { ...post, body: form }),
  suggestFromReceipt: (form: FormData) =>
    request<SuggestionDto>('/api/expense-notes/receipt-suggestion', { ...post, body: form }),
  receiptUrl: (id: string) => request<ReceiptUrlDto>(`/api/expense-notes/${id}/receipt-url`),
}

export const managerApi = {
  listPending: () => request<ExpenseNoteDto[]>('/api/manager/expense-notes'),
  receiptUrl: (id: string) => request<ReceiptUrlDto>(`/api/manager/expense-notes/${id}/receipt-url`),
  decide: (id: string, decision: Decision) =>
    request<ExpenseNoteDto>(`/api/manager/expense-notes/${id}/${decision}`, post),
}

export const hrApi = {
  listUsers: () => request<CompanyUserDto[]>('/api/hr/users'),
  assignManager: (userId: string, managerId: string | null) =>
    request<CompanyUserDto>(`/api/hr/users/${userId}/manager`, putJson({ managerId })),
  changeRole: (userId: string, role: CompanyUserDto['role'] | HrUserDto['role']) =>
    request<CompanyUserDto>(`/api/hr/users/${userId}/role`, putJson({ role })),
  me: () => request<HrUserDto>('/api/hr/me'),
  listAdmins: () => request<HrUserDto[]>('/api/hr/admins'),
  listPending: () => request<ExpenseNoteDto[]>('/api/hr/expense-notes'),
  receiptUrl: (id: string) => request<ReceiptUrlDto>(`/api/hr/expense-notes/${id}/receipt-url`),
  decide: (id: string, decision: Decision) =>
    request<ExpenseNoteDto>(`/api/hr/expense-notes/${id}/${decision}`, post),
}
