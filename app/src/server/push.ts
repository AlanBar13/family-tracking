import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { aErrorApp, ErrorApp, paraCliente } from '@/lib/errores'
import { MENSAJES } from '@/lib/mensajes'
import { requerirMiembro } from './requerir-miembro'

const suscripcion = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

async function ejecutar<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f()
  } catch (e) {
    throw paraCliente(aErrorApp(e))
  }
}

function validar<T extends z.ZodType>(esquema: T, x: unknown): z.output<T> {
  const r = esquema.safeParse(x)
  if (!r.success) throw new ErrorApp('VALIDACION', MENSAJES.interno)
  return r.data
}

export const guardarSuscripcion = createServerFn({ method: 'POST' })
  .validator((x: unknown) => x as z.input<typeof suscripcion>)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = validar(suscripcion, data)
      const ctx = await requerirMiembro()
      const { error } = await ctx.supabase.from('suscripciones_push').upsert({
        endpoint: d.endpoint,
        p256dh: d.keys.p256dh,
        auth: d.keys.auth,
        miembro_id: ctx.miembro.id,
      })
      if (error) throw error
    }),
  )

export const borrarSuscripcion = createServerFn({ method: 'POST' })
  .validator((x: unknown) => x as { endpoint: string })
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = validar(z.object({ endpoint: z.string() }), data)
      const ctx = await requerirMiembro()
      const { error } = await ctx.supabase
        .from('suscripciones_push')
        .delete()
        .eq('endpoint', d.endpoint)
      if (error) throw error
    }),
  )
