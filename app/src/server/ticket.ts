import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { aErrorApp, ErrorApp, paraCliente } from '@/lib/errores'
import { hoyEnZona } from '@/lib/fechas'
import { aErrorVisible } from '@/lib/validacion'
import { MODELO_PREDETERMINADO } from '@/lib/ticket'
import { requerirMiembro } from './requerir-miembro'
import { leerTicketDe } from './ticket-logica'

const esquema = z.object({ base64: z.string().min(1, 'No llegó la foto.') })

export const leerTicket = createServerFn({ method: 'POST' })
  .validator((x: unknown) => x as { base64: string })
  .handler(async ({ data }) => {
    try {
      const r = esquema.safeParse(data)
      if (!r.success) throw new ErrorApp('VALIDACION', aErrorVisible(r.error))
      const { supabase } = await requerirMiembro()
      const [c, t] = await Promise.all([
        supabase.from('categorias').select('id, nombre').eq('activa', true).order('orden').order('nombre'),
        supabase.from('tipos_pago').select('id, nombre').eq('activo', true).order('orden').order('nombre'),
      ])
      if (c.error || t.error) {
        console.error('leerTicket: config', c.error ?? t.error)
        throw new ErrorApp('INTERNO', 'Algo salió mal. Intenta de nuevo.')
      }
      return await leerTicketDe(r.data.base64, {
        llave: process.env.GEMINI_API_KEY,
        modelo: process.env.GEMINI_MODELO || MODELO_PREDETERMINADO,
        hoy: hoyEnZona(process.env.HOGAR_ZONA_HORARIA || 'America/Mexico_City'),
        categorias: c.data,
        tiposPago: t.data,
      })
    } catch (e) {
      throw paraCliente(aErrorApp(e))
    }
  })
