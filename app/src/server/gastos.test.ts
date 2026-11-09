import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Contexto } from './miembro'
import { ErrorApp, leerErrorApp, paraCliente } from '@/lib/errores'
import {
  actualizarGastoDe,
  agregarGastoDe,
  borrarGastoDe,
  traducirErrorDb,
} from './gastos-logica'
import { avisarATodos } from './push-logica'

vi.mock('./push-logica', () => ({ avisarATodos: vi.fn(async () => {}) }))

vi.spyOn(console, 'error').mockImplementation(() => {})

const uuid = (n: number) => `${String(n).repeat(8)}-1111-4111-8111-111111111111`
const CAT_ACTIVA = uuid(1)
const CAT_INACTIVA = uuid(2)
const PAGO = uuid(3)
const GASTO = uuid(4)
const CAT_PRES = uuid(5)

type Llamada = { tabla: string; op: string; datos?: unknown }

/** Supabase simulado: cada consulta es un thenable que resuelve según tabla y operación. */
function ctxFalso(
  opciones: {
    gastoExiste?: boolean
    presupuesto?: number | null
    /** Montos que devuelve la consulta del mes (ya incluyen el gasto guardado). */
    montos?: number[]
    previoCategoria?: string
  } = {},
) {
  const { gastoExiste = true, presupuesto = null, montos = [], previoCategoria } = opciones
  const llamadas: Llamada[] = []
  const consultasMonto = { n: 0 }
  const from = (tabla: string) => {
    let op = 'select'
    let idFiltro: string | undefined
    let columnas = ''
    const q: Record<string, unknown> = {}
    const respuesta = () => {
      if (tabla === 'gastos' && op === 'select' && columnas === 'monto') {
        consultasMonto.n++
        return { data: montos.map((monto) => ({ monto })), error: null }
      }
      if (tabla === 'categorias' && op === 'select' && columnas.startsWith('activa'))
        return {
          data:
            idFiltro === CAT_PRES
              ? { activa: true, nombre: 'Súper', presupuesto }
              : idFiltro === CAT_ACTIVA
              ? { activa: true, nombre: 'Súper', presupuesto: null }
              : idFiltro === CAT_INACTIVA
                ? { activa: false, nombre: 'Vieja', presupuesto: null }
                : null,
          error: null,
        }
      if (tabla === 'tipos_pago' && columnas === 'activo')
        return { data: idFiltro === PAGO ? { activo: true } : null, error: null }
      if (tabla === 'gastos' && columnas.startsWith('categoria_id') && op === 'select')
        return {
          data: gastoExiste
            ? {
                categoria_id: previoCategoria ?? CAT_INACTIVA,
                tipo_pago_id: PAGO,
                monto: 10,
                fecha: '2026-03-01',
              }
            : null,
          error: null,
        }
      if (tabla === 'gastos' && (op === 'update' || op === 'delete'))
        return { data: gastoExiste ? [{ id: GASTO }] : [], error: null }
      return { data: [], error: null }
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
  return { ctx, llamadas, consultasMonto }
}

const entrada = {
  nombre: 'Tortillas',
  monto: 25,
  fecha: '2026-03-03',
  categoriaId: CAT_ACTIVA,
  tipoPagoId: PAGO,
  notas: '',
}

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
    await agregarGastoDe(ctx, { ...entrada, autorId: 'hacker' } as never)
    const insert = llamadas.find((l) => l.op === 'insert')!.datos as Record<
      string,
      unknown
    >
    expect(insert.autor_id).toBe('m-sesion')
    expect(insert).not.toHaveProperty('autorId')
  })

  it('rechaza una categoría inactiva al crear', async () => {
    const { ctx } = ctxFalso()
    const e = await fallo(agregarGastoDe(ctx, { ...entrada, categoriaId: CAT_INACTIVA }))
    expect(e).toMatchObject({
      codigo: 'VALIDACION',
      message: 'Esa categoría no existe. Revísala en Ajustes.',
    })
  })

  it('rechaza una categoría inexistente', async () => {
    const { ctx } = ctxFalso()
    const e = await fallo(agregarGastoDe(ctx, { ...entrada, categoriaId: uuid(9) }))
    expect(e.codigo).toBe('VALIDACION')
  })

  it('al editar no toca autor_id y permite conservar la categoría inactiva que ya tenía', async () => {
    const { ctx, llamadas } = ctxFalso()
    await actualizarGastoDe(ctx, { ...entrada, id: GASTO, categoriaId: CAT_INACTIVA })
    const upd = llamadas.find((l) => l.op === 'update')!.datos as Record<string, unknown>
    expect(upd).not.toHaveProperty('autor_id')
  })

  it('editar un gasto inexistente: NO_ENCONTRADO', async () => {
    const { ctx } = ctxFalso({ gastoExiste: false })
    const e = await fallo(actualizarGastoDe(ctx, { ...entrada, id: GASTO }))
    expect(e).toMatchObject({
      codigo: 'NO_ENCONTRADO',
      message: 'Ese gasto ya no existe.',
    })
  })

  it('borrar un gasto inexistente: NO_ENCONTRADO', async () => {
    const { ctx } = ctxFalso({ gastoExiste: false })
    const e = await fallo(borrarGastoDe(ctx, { id: GASTO, mes: '2026-03' }))
    expect(e).toMatchObject({
      codigo: 'NO_ENCONTRADO',
      message: 'Ese gasto ya no existe.',
    })
  })

  it('borrar devuelve el mes que se veía', async () => {
    const { ctx } = ctxFalso()
    const r = await borrarGastoDe(ctx, { id: GASTO, mes: '2026-03' })
    expect(r).toEqual({ mes: '2026-03' })
  })
})

describe('aviso de presupuesto', () => {
  beforeEach(() => vi.mocked(avisarATodos).mockClear())
  const conPres = { ...entrada, categoriaId: CAT_PRES }

  it('categoría sin presupuesto: no consulta montos ni avisa', async () => {
    const { ctx, consultasMonto } = ctxFalso({ presupuesto: null, montos: [999] })
    const r = await agregarGastoDe(ctx, conPres)
    expect(r).toEqual({ mes: '2026-03' })
    expect(consultasMonto.n).toBe(0)
    expect(avisarATodos).not.toHaveBeenCalled()
  })

  it('agregar que cruza el 80% avisa una vez con el tag de la categoría', async () => {
    const { ctx, consultasMonto } = ctxFalso({ presupuesto: 100, montos: [55, 25] })
    await agregarGastoDe(ctx, conPres)
    expect(consultasMonto.n).toBe(1)
    expect(avisarATodos).toHaveBeenCalledTimes(1)
    expect(vi.mocked(avisarATodos).mock.calls[0]![1]).toMatchObject({
      tag: `presupuesto-${CAT_PRES}`,
    })
  })

  it('agregar que no cruza no avisa', async () => {
    const { ctx } = ctxFalso({ presupuesto: 100, montos: [30, 25] })
    await agregarGastoDe(ctx, conPres)
    expect(avisarATodos).not.toHaveBeenCalled()
  })

  it('actualizar el mismo gasto (mismo mes y categoría) descuenta el previo y no avisa si ya estaba arriba', async () => {
    // previo 10, ahora 25: antes 80 (ya en 80%), después 95.
    const { ctx } = ctxFalso({
      presupuesto: 100,
      montos: [70, 25],
      previoCategoria: CAT_PRES,
    })
    const r = await actualizarGastoDe(ctx, { ...conPres, id: GASTO })
    expect(r).toEqual({ mes: '2026-03' })
    expect(avisarATodos).not.toHaveBeenCalled()
  })

  it('actualizar que sí cruza usando el previo avisa', async () => {
    // previo 10, ahora 25: antes 70 (bajo 80), después 85.
    const { ctx } = ctxFalso({
      presupuesto: 100,
      montos: [60, 25],
      previoCategoria: CAT_PRES,
    })
    await actualizarGastoDe(ctx, { ...conPres, id: GASTO })
    expect(avisarATodos).toHaveBeenCalledTimes(1)
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
