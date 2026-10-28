import { listHrAdmins } from '@/modules/organization'
import { route } from '@/modules/shared/http'

export const GET = route({ role: 'hr_admin' }, async ({ actor }) => Response.json(await listHrAdmins(actor)))
