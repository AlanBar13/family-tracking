import { ErrorApp, nombreVisible } from '@/lib/errores'
import { hoyEnZona, listaDeMeses, normalizarMes, rangoDelMes } from '@/lib/fechas'
import { MENSAJES } from '@/lib/mensajes'
import type { GastoEntrada } from '@/lib/validacion'
import type { Contexto } from './miembro'

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
      .select('id, nombre, orden, activa')
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
      categorias: ok(categorias),
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

export async function agregarGastoDe(ctx: Contexto, g: GastoEntrada, zona: string) {
  await validarReferencias(ctx.supabase, g)
  // El autor sale SIEMPRE de la sesión, nunca del cliente.
  ok(
    await ctx.supabase
      .from('gastos')
      .insert({ ...columnas(g), autor_id: ctx.miembro.id }),
  )
  return obtenerEstadoDe(ctx, g.fecha.slice(0, 7), zona)
}

export async function actualizarGastoDe(
  ctx: Contexto,
  { id, ...g }: GastoEntrada & { id: string },
  zona: string,
) {
  const previo = ok(
    await ctx.supabase
      .from('gastos')
      .select('categoria_id, tipo_pago_id')
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
  return obtenerEstadoDe(ctx, g.fecha.slice(0, 7), zona)
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
