// Registro de visita à loja (público, sempre 204) — a lógica fica em src/server (veja VisitaController)
import { visitaController } from '@/server/container'

export const dynamic = 'force-dynamic'

export const POST = visitaController.registrar
