import { forbidden } from 'next/navigation'
import { PendingApprovalsPanel } from '@/components/PendingApprovalsPanel'
import { getActor } from '@/modules/identity'

export default async function ManagerPage() {
  // Mauvais rôle : page « Accès réservé » (forbidden.tsx) servie en 403 (D19, ADR-019).
  if ((await getActor())?.role !== 'manager') forbidden()

  return <PendingApprovalsPanel />
}
