import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { aErrorApp, ErrorApp, paraCliente } from '@/lib/errores'
import { MODELO_PREDETERMINADO } from '@/lib/ticket'
import { aErrorVisible } from '@/lib/validacion'
import { analizarGastosDe } from './analisis-logica'
import { requerirMiembro } from './requerir-miembro'

const esquema = z.object({ mes: z.string().min(1, 'Falta el mes.') })

export const analizarGastos = createServerFn({ method: 'POST' })
  .validator((x: unknown) => x as { mes: string })
  .handler(async ({ data }) => {
    try {
      const r = esquema.safeParse(data)
      if (!r.success) throw new ErrorApp('VALIDACION', aErrorVisible(r.error))
      return await analizarGastosDe(
        await requerirMiembro(),
        r.data.mes,
        process.env.HOGAR_ZONA_HORARIA || 'America/Mexico_City',
        {
          llave: process.env.GEMINI_API_KEY,
          modelo: process.env.GEMINI_MODELO || MODELO_PREDETERMINADO,
        },
      )
    } catch (e) {
      throw paraCliente(aErrorApp(e))
    }
  })
