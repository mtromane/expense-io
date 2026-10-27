import { forbidden } from 'next/navigation'
import { PendingApprovalsPanel } from '@/components/PendingApprovalsPanel'
import { currentActor } from '@/app/current-user'

export default async function ManagerPage() {
  // Mauvais rôle : page « Accès réservé » (forbidden.tsx) servie en 403 (D19, ADR-019).
  if ((await currentActor())?.role !== 'manager') forbidden()

  return <PendingApprovalsPanel />
}
