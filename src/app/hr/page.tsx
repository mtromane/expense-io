import { forbidden } from 'next/navigation'
import { AdminConsole } from '@/components/AdminConsole'
import { currentActor } from '@/app/current-user'

export default async function HrPage() {
  // Mauvais rôle : page « Accès réservé » (forbidden.tsx) servie en 403 (D19, ADR-019).
  if ((await currentActor())?.role !== 'hr_admin') forbidden()

  return <AdminConsole />
}
