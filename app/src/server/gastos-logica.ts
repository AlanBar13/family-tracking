import { sumar } from '@/lib/dinero'
import { ErrorApp, nombreVisible } from '@/lib/errores'
import { hoyEnZona, listaDeMeses, normalizarMes, rangoDelMes } from '@/lib/fechas'
import { MENSAJES } from '@/lib/mensajes'
import { mensajeAviso, umbralCruzado } from '@/lib/presupuesto'
import type { GastoEntrada } from '@/lib/validacion'
import type { Contexto } from './miembro'
import { avisarATodos } from './push-logica'

type Cliente = Contexto['supabase']
type ErrorDb = { code?: string; message?: string }

/** Traduce un error de Postgres/PostgREST a un ErrorApp; el texto crudo solo va al log. */
export function traducirErrorDb(error: ErrorDb): ErrorApp {
  console.error('Error de base de datos', error)
  const { code = '', message = '' } = error
  if (code === '23503') {
    if (message.includes('categoria'))
      return new ErrorApp('VALIDACION', MENSAJES.categoriaInvalida)
    if (message.includes('tipo_pago'))
      return new ErrorApp('VALIDACION', MENSAJES.tipoPagoInvalido)
  }
  if (code === '23514') {
    if (message.includes('monto'))
      return new ErrorApp('VALIDACION', MENSAJES.montoInvalido)
    if (message.includes('nombre'))
      return new ErrorApp('VALIDACION', MENSAJES.nombreVacio)
  }
  if (code === '22007' || code === '22008')
    return new ErrorApp('VALIDACION', MENSAJES.fechaInvalida)
  return new ErrorApp('INTERNO', MENSAJES.interno)
}

/** Desenvuelve `{ data, error }` de Supabase: lanza ErrorApp si hubo error. */
function ok<T>(r: { data: T | null; error: ErrorDb | null }): T {
  if (r.error) throw traducirErrorDb(r.error)
  return r.data as T
}

export async function obtenerEstadoDe(ctx: Contexto, mesEntrada: unknown, zona: string) {
  const { supabase, miembro } = ctx
  const mes = normalizarMes(mesEntrada, zona)
  const { desde, hasta } = rangoDelMes(mes)
  const hoy = hoyEnZona(zona)

  const [categorias, tiposPago, miembros, mesesDb, gastos] = await Promise.all([
    supabase
      .from('categorias')
      .select('id, nombre, orden, activa, presupuesto')
      .order('orden')
      .order('nombre'),
    supabase
      .from('tipos_pago')
      .select('id, nombre, orden, activo')
      .order('orden')
      .order('nombre'),
    supabase.from('miembros').select('id, nombre, correo').order('nombre'),
    supabase.rpc('meses_con_gastos'),
    supabase
      .from('gastos')
      .select('id, nombre, monto, fecha, categoria_id, tipo_pago_id, autor_id, notas')
      .gte('fecha', desde)
      .lt('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return {
    miembro: {
      id: miembro.id,
      nombre: nombreVisible(miembro),
      correo: miembro.correo,
      esAdmin: miembro.es_admin,
    },
    hoy,
    mes,
    meses: listaDeMeses(ok(mesesDb) ?? [], hoy.slice(0, 7)),
    config: {
      categorias: ok(categorias).map((c) => ({
        ...c,
        presupuesto: c.presupuesto === null ? null : Number(c.presupuesto),
      })),
      tiposPago: ok(tiposPago),
      miembros: ok(miembros).map((m) => ({ id: m.id, nombre: nombreVisible(m) })),
    },
    gastos: ok(gastos).map((g) => ({
      id: g.id,
      nombre: g.nombre,
      monto: Number(g.monto),
      fecha: g.fecha,
      categoriaId: g.categoria_id,
      tipoPagoId: g.tipo_pago_id,
      autorId: g.autor_id,
      notas: g.notas,
    })),
  }
}

export type Estado = Awaited<ReturnType<typeof obtenerEstadoDe>>

/** Categoría y tipo de pago deben existir y estar activos (salvo los que el gasto ya tenía). */
async function validarReferencias(
  supabase: Cliente,
  g: GastoEntrada,
  actual?: { categoria_id: string; tipo_pago_id: string },
) {
  const [c, t] = await Promise.all([
    supabase.from('categorias').select('activa').eq('id', g.categoriaId).maybeSingle(),
    supabase.from('tipos_pago').select('activo').eq('id', g.tipoPagoId).maybeSingle(),
  ])
  const cat = ok(c)
  const tipo = ok(t)
  if (!cat || (!cat.activa && g.categoriaId !== actual?.categoria_id))
    throw new ErrorApp('VALIDACION', MENSAJES.categoriaInvalida)
  if (!tipo || (!tipo.activo && g.tipoPagoId !== actual?.tipo_pago_id))
    throw new ErrorApp('VALIDACION', MENSAJES.tipoPagoInvalido)
}

const columnas = (g: GastoEntrada) => ({
  nombre: g.nombre,
  monto: g.monto,
  fecha: g.fecha,
  categoria_id: g.categoriaId,
  tipo_pago_id: g.tipoPagoId,
  notas: g.notas,
})

/**
 * Si el gasto hizo que su categoría cruzara el 80% o el 100% del presupuesto del mes,
 * avisa a todos. `previo`: lo que el mismo gasto ya sumaba a esa categoría y mes.
 */
async function avisarSiCruza(ctx: Contexto, estado: Estado, g: GastoEntrada, previo = 0) {
  const cat = estado.config.categorias.find((c) => c.id === g.categoriaId)
  if (!cat?.presupuesto) return
  const despues = sumar(
    estado.gastos.filter((x) => x.categoriaId === cat.id).map((x) => x.monto),
  )
  const antes = sumar([despues, -g.monto, previo])
  const umbral = umbralCruzado(antes, despues, cat.presupuesto)
  if (umbral)
    await avisarATodos(ctx, {
      ...mensajeAviso(cat.nombre, despues, cat.presupuesto, umbral),
      tag: `presupuesto-${cat.id}`,
    })
}

export async function agregarGastoDe(ctx: Contexto, g: GastoEntrada, zona: string) {
  await validarReferencias(ctx.supabase, g)
  // El autor sale SIEMPRE de la sesión, nunca del cliente.
  ok(
    await ctx.supabase
      .from('gastos')
      .insert({ ...columnas(g), autor_id: ctx.miembro.id }),
  )
  const estado = await obtenerEstadoDe(ctx, g.fecha.slice(0, 7), zona)
  await avisarSiCruza(ctx, estado, g)
  return estado
}

export async function actualizarGastoDe(
  ctx: Contexto,
  { id, ...g }: GastoEntrada & { id: string },
  zona: string,
) {
  const previo: {
    categoria_id: string
    tipo_pago_id: string
    monto: number
    fecha: string
  } | null = ok(
    await ctx.supabase
      .from('gastos')
      .select('categoria_id, tipo_pago_id, monto, fecha')
      .eq('id', id)
      .maybeSingle(),
  )
  if (!previo) throw new ErrorApp('NO_ENCONTRADO', MENSAJES.gastoNoExiste)
  await validarReferencias(ctx.supabase, g, previo)
  // Sin autor_id: el autor original no cambia.
  const filas = ok(
    await ctx.supabase.from('gastos').update(columnas(g)).eq('id', id).select('id'),
  )
  if (filas.length === 0) throw new ErrorApp('NO_ENCONTRADO', MENSAJES.gastoNoExiste)
  const estado = await obtenerEstadoDe(ctx, g.fecha.slice(0, 7), zona)
  const mismoGrupo =
    previo.categoria_id === g.categoriaId &&
    previo.fecha.slice(0, 7) === g.fecha.slice(0, 7)
  await avisarSiCruza(ctx, estado, g, mismoGrupo ? Number(previo.monto) : 0)
  return estado
}

export async function borrarGastoDe(
  ctx: Contexto,
  { id, mes }: { id: string; mes: string },
  zona: string,
) {
  const filas = ok(await ctx.supabase.from('gastos').delete().eq('id', id).select('id'))
  if (filas.length === 0) throw new ErrorApp('NO_ENCONTRADO', MENSAJES.gastoNoExiste)
  return obtenerEstadoDe(ctx, mes, zona)
}
