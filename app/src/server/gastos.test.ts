import { describe, expect, it, vi } from 'vitest'
import type { Contexto } from './miembro'
import { ErrorApp, leerErrorApp, paraCliente } from '@/lib/errores'
import {
  actualizarGastoDe,
  agregarGastoDe,
  borrarGastoDe,
  traducirErrorDb,
} from './gastos-logica'

vi.spyOn(console, 'error').mockImplementation(() => {})

const uuid = (n: number) => `${String(n).repeat(8)}-1111-4111-8111-111111111111`
const CAT_ACTIVA = uuid(1)
const CAT_INACTIVA = uuid(2)
const PAGO = uuid(3)
const GASTO = uuid(4)

type Llamada = { tabla: string; op: string; datos?: unknown }

/** Supabase simulado: cada consulta es un thenable que resuelve según tabla y operación. */
function ctxFalso(opciones: { gastoExiste?: boolean } = {}) {
  const { gastoExiste = true } = opciones
  const llamadas: Llamada[] = []
  const resolver = (tabla: string, op: string) => {
    if (tabla === 'categorias' && op === 'select')
      return { data: { activa: false }, error: null } // se sobreescribe abajo por id
    return { data: [], error: null }
  }
  const from = (tabla: string) => {
    let op = 'select'
    let idFiltro: string | undefined
    let columnas = ''
    const q: Record<string, unknown> = {}
    const respuesta = () => {
      if (tabla === 'categorias' && op === 'select' && columnas === 'activa')
        return {
          data:
            idFiltro === CAT_ACTIVA
              ? { activa: true }
              : idFiltro === CAT_INACTIVA
                ? { activa: false }
                : null,
          error: null,
        }
      if (tabla === 'tipos_pago' && columnas === 'activo')
        return { data: idFiltro === PAGO ? { activo: true } : null, error: null }
      if (tabla === 'gastos' && columnas.startsWith('categoria_id') && op === 'select')
        return {
          data: gastoExiste ? { categoria_id: CAT_INACTIVA, tipo_pago_id: PAGO } : null,
          error: null,
        }
      if (tabla === 'gastos' && (op === 'update' || op === 'delete'))
        return { data: gastoExiste ? [{ id: GASTO }] : [], error: null }
      return resolver(tabla, op)
    }
    const encadenar =
      (nombre: string) =>
      (...args: unknown[]) => {
        if (['insert', 'update', 'delete'].includes(nombre)) {
          op = nombre
          llamadas.push({ tabla, op, datos: args[0] })
        }
        if (nombre === 'select' && typeof args[0] === 'string') columnas = args[0]
        if (nombre === 'eq' && args[0] === 'id') idFiltro = args[1] as string
        return q
      }
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lt', 'order'])
      q[m] = encadenar(m)
    q.maybeSingle = async () => respuesta()
    q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(respuesta()).then(res, rej)
    return q
  }
  const ctx = {
    supabase: { from, rpc: async () => ({ data: [], error: null }) },
    usuario: { id: 'u1' },
    miembro: { id: 'm-sesion', nombre: 'Ana', correo: 'ana@casa.mx', es_admin: false },
  } as unknown as Contexto
  return { ctx, llamadas }
}

const entrada = {
  nombre: 'Tortillas',
  monto: 25,
  fecha: '2026-03-03',
  categoriaId: CAT_ACTIVA,
  tipoPagoId: PAGO,
  notas: '',
}
const ZONA = 'America/Mexico_City'

async function fallo(p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    return e as ErrorApp
  }
  throw new Error('no falló')
}

describe('gastos (Supabase simulado)', () => {
  it('el autor sale de la sesión aunque el cliente mande otro', async () => {
    const { ctx, llamadas } = ctxFalso()
    await agregarGastoDe(ctx, { ...entrada, autorId: 'hacker' } as never, ZONA)
    const insert = llamadas.find((l) => l.op === 'insert')!.datos as Record<
      string,
      unknown
    >
    expect(insert.autor_id).toBe('m-sesion')
    expect(insert).not.toHaveProperty('autorId')
  })

  it('rechaza una categoría inactiva al crear', async () => {
    const { ctx } = ctxFalso()
    const e = await fallo(
      agregarGastoDe(ctx, { ...entrada, categoriaId: CAT_INACTIVA }, ZONA),
    )
    expect(e).toMatchObject({
      codigo: 'VALIDACION',
      message: 'Esa categoría no existe. Revísala en Ajustes.',
    })
  })

  it('rechaza una categoría inexistente', async () => {
    const { ctx } = ctxFalso()
    const e = await fallo(agregarGastoDe(ctx, { ...entrada, categoriaId: uuid(9) }, ZONA))
    expect(e.codigo).toBe('VALIDACION')
  })

  it('al editar no toca autor_id y permite conservar la categoría inactiva que ya tenía', async () => {
    const { ctx, llamadas } = ctxFalso()
    await actualizarGastoDe(
      ctx,
      { ...entrada, id: GASTO, categoriaId: CAT_INACTIVA },
      ZONA,
    )
    const upd = llamadas.find((l) => l.op === 'update')!.datos as Record<string, unknown>
    expect(upd).not.toHaveProperty('autor_id')
  })

  it('editar un gasto inexistente: NO_ENCONTRADO', async () => {
    const { ctx } = ctxFalso({ gastoExiste: false })
    const e = await fallo(actualizarGastoDe(ctx, { ...entrada, id: GASTO }, ZONA))
    expect(e).toMatchObject({
      codigo: 'NO_ENCONTRADO',
      message: 'Ese gasto ya no existe.',
    })
  })

  it('borrar un gasto inexistente: NO_ENCONTRADO', async () => {
    const { ctx } = ctxFalso({ gastoExiste: false })
    const e = await fallo(borrarGastoDe(ctx, { id: GASTO, mes: '2026-03' }, ZONA))
    expect(e).toMatchObject({
      codigo: 'NO_ENCONTRADO',
      message: 'Ese gasto ya no existe.',
    })
  })

  it('borrar devuelve el estado del mes que se veía', async () => {
    const { ctx } = ctxFalso()
    const estado = await borrarGastoDe(ctx, { id: GASTO, mes: '2026-03' }, ZONA)
    expect(estado.mes).toBe('2026-03')
  })
})

describe('errores', () => {
  it('traducirErrorDb nunca filtra el texto crudo', () => {
    const e = traducirErrorDb({
      code: '23503',
      message: 'violates foreign key gastos_categoria_id_fkey',
    })
    expect(e.message).toBe('Esa categoría no existe. Revísala en Ajustes.')
    const raro = traducirErrorDb({ code: 'XX000', message: 'secreto de postgres' })
    expect(raro).toMatchObject({
      codigo: 'INTERNO',
      message: 'Algo salió mal. Intenta de nuevo.',
    })
  })

  it('leerErrorApp lee el formato [CODIGO] mensaje que viaja al cliente', () => {
    const enviado = paraCliente(new ErrorApp('NO_ENCONTRADO', 'Ese gasto ya no existe.'))
    // El cliente solo recibe un Error plano con el mensaje.
    expect(leerErrorApp(new Error(enviado.message))).toEqual({
      codigo: 'NO_ENCONTRADO',
      mensaje: 'Ese gasto ya no existe.',
    })
    expect(leerErrorApp(new TypeError('Failed to fetch'))).toEqual({
      codigo: 'INTERNO',
      mensaje: 'Algo salió mal. Intenta de nuevo.',
    })
  })
})
