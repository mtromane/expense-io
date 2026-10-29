'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PendingExpenseNoteDto } from '@/modules/shared/http/presenters'
import { managerApi, type Decision } from '@/utils/api'
import { formatCurrency, formatDate } from '@/utils/format'

export function PendingApprovalsPanel() {
  const [notes, setNotes] = useState<PendingExpenseNoteDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decidingId, setDecidingId] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    const result = await managerApi.listPending()
    if (result.ok) {
      setNotes(result.data)
    } else {
      setError('Impossible de charger les notes en attente.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPending()
  }, [loadPending])

  async function handleViewReceipt(id: string) {
    setError(null)
    const result = await managerApi.receiptUrl(id)
    if (!result.ok) {
      setError('Impossible de récupérer le reçu.')
      return
    }
    window.open(result.data.url, '_blank', 'noopener,noreferrer')
  }

  async function handleDecide(id: string, decision: Decision) {
    setDecidingId(id)
    setError(null)
    const result = await managerApi.decide(id, decision)
    setDecidingId(null)

    if (result.ok) {
      await loadPending()
    } else {
      setError(result.error ?? 'Échec de la décision sur cette note de frais.')
    }
  }

  return (
    <main className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Validation des notes de frais</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Notes en attente des employés qui vous sont rattachés. Le
          rattachement est géré par la RH de votre entreprise (page RH).
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="border-b border-gray-200 px-6 py-4 text-base font-semibold dark:border-gray-800">
          En attente ({notes.length})
        </h2>
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Chargement…
          </p>
        ) : notes.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Aucune note en attente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-6 py-3 font-medium">Employé</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 text-right font-medium">Montant</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {notes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-3">{note.authorName}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {formatDate(note.expenseDate)}
                    </td>
                    <td className="px-6 py-3">{note.description}</td>
                    <td className="px-6 py-3 text-right font-medium whitespace-nowrap">
                      {formatCurrency(note.amount)}
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(note.id)}
                        className="mr-3 text-sm font-medium text-brand-600 hover:underline"
                      >
                        Voir le reçu
                      </button>
                      <button
                        type="button"
                        disabled={decidingId === note.id}
                        onClick={() => handleDecide(note.id, 'approve')}
                        className="mr-3 text-sm font-medium text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        disabled={decidingId === note.id}
                        onClick={() => handleDecide(note.id, 'reject')}
                        className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Rejeter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
