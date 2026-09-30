import { createServerFn } from '@tanstack/react-start'
import { ErrorApp, nombreVisible } from '@/lib/errores'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { resolverMiembro } from './miembro'

export type Sesion =
  | { estado: 'anonimo' }
  | { estado: 'no_miembro'; correo: string }
  | {
      estado: 'ok'
      miembro: { id: string; nombre: string; correo: string; esAdmin: boolean }
    }

export const obtenerSesion = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Sesion> => {
    const supabase = crearClienteServidor()
    try {
      const { miembro } = await resolverMiembro(supabase)
      return {
        estado: 'ok',
        miembro: {
          id: miembro.id,
          nombre: nombreVisible(miembro),
          correo: miembro.correo,
          esAdmin: miembro.es_admin,
        },
      }
    } catch (e) {
      if (e instanceof ErrorApp && e.codigo === 'NO_AUTENTICADO') {
        return { estado: 'anonimo' }
      }
      if (e instanceof ErrorApp && e.codigo === 'NO_AUTORIZADO') {
        const { data } = await supabase.auth.getUser()
        await supabase.auth.signOut()
        return { estado: 'no_miembro', correo: data.user?.email ?? '' }
      }
      console.error('obtenerSesion falló', e)
      throw e
    }
  },
)

export const cerrarSesion = createServerFn({ method: 'POST' }).handler(async () => {
  await crearClienteServidor().auth.signOut()
})
