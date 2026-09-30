import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { ErrorApp } from '@/lib/errores'
import { resolverMiembro } from './miembro'

type Fila = { id: string; correo: string; nombre: string; activo: boolean }

function clienteFalso(opciones: { correo?: string | null; filas?: Fila[] }) {
  const usuario = opciones.correo ? { id: 'u1', email: opciones.correo } : null
  const filtros: Partial<Fila>[] = []
  const consulta = {
    select: () => consulta,
    eq: (columna: keyof Fila, valor: unknown) => {
      filtros.push({ [columna]: valor })
      return consulta
    },
    maybeSingle: async () => {
      const fila = (opciones.filas ?? []).find((f) =>
        filtros.every((filtro) =>
          Object.entries(filtro).every(([k, v]) => f[k as keyof Fila] === v),
        ),
      )
      return { data: fila ?? null, error: null }
    },
  }
  return {
    auth: { getUser: async () => ({ data: { user: usuario }, error: null }) },
    rpc: async () => ({ data: null, error: null }),
    from: () => consulta,
  } as unknown as SupabaseClient<Database>
}

const activo: Fila = { id: 'm1', correo: 'ana@casa.mx', nombre: 'Ana', activo: true }

async function codigoDe(promesa: Promise<unknown>) {
  try {
    await promesa
  } catch (e) {
    return e instanceof ErrorApp ? e : new Error('error inesperado')
  }
  return null
}

describe('resolverMiembro', () => {
  it('sin usuario lanza NO_AUTENTICADO', async () => {
    const e = await codigoDe(resolverMiembro(clienteFalso({ correo: null })))
    expect(e).toMatchObject({ codigo: 'NO_AUTENTICADO' })
  })

  it('usuario que no es miembro lanza NO_AUTORIZADO con el mensaje', async () => {
    const e = await codigoDe(
      resolverMiembro(clienteFalso({ correo: 'X@fuera.com', filas: [activo] })),
    )
    expect(e).toMatchObject({
      codigo: 'NO_AUTORIZADO',
      message: 'La cuenta x@fuera.com no tiene acceso. Pide que te agreguen en Ajustes.',
    })
  })

  it('miembro inactivo lanza NO_AUTORIZADO', async () => {
    const e = await codigoDe(
      resolverMiembro(
        clienteFalso({ correo: 'ana@casa.mx', filas: [{ ...activo, activo: false }] }),
      ),
    )
    expect(e).toMatchObject({ codigo: 'NO_AUTORIZADO' })
  })

  it('miembro activo devuelve supabase, usuario y miembro', async () => {
    const ctx = await resolverMiembro(
      clienteFalso({ correo: 'ana@casa.mx', filas: [activo] }),
    )
    expect(ctx.miembro).toEqual(activo)
    expect(ctx.usuario.email).toBe('ana@casa.mx')
    expect(ctx.supabase).toBeDefined()
  })
})
