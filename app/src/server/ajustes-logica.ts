import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorApp } from '@/lib/errores'
import {
  MSG,
  TIPOS,
  errorDeMiembro,
  nombreDuplicado,
  quedaUnoActivo,
  type Tipo,
} from '@/lib/ajustes'
import { traducirErrorDb } from './gastos-logica'
import type { Contexto } from './miembro'

// Las tablas se eligen por nombre en tiempo de ejecución: cliente sin tipos.
type Cliente = SupabaseClient
type ErrorDb = { code?: string; message?: string }

function ok<T>(r: { data: T | null; error: ErrorDb | null }): T {
  if (r.error) throw traducirErrorDb(r.error)
  return r.data as T
}

const db = (ctx: Contexto) => ctx.supabase as unknown as Cliente

function exigirAdmin(ctx: Contexto) {
  if (!ctx.miembro.es_admin) throw new ErrorApp('NO_AUTORIZADO', MSG.soloAdmin)
}

type Fila = {
  id: string
  nombre: string
  orden: number
  activo: boolean
  gastos: number
  presupuesto: number | null
}

function contar(gastos: Record<string, string>[], fk: string) {
  const n = new Map<string, number>()
  for (const g of gastos) n.set(g[fk]!, (n.get(g[fk]!) ?? 0) + 1)
  return n
}

export async function obtenerAjustesDe(ctx: Contexto) {
  const s = db(ctx)
  // ponytail: se traen todos los gastos solo para contarlos; para un hogar (miles de filas) basta.
  const [cats, pagos, miembros, gastos] = await Promise.all([
    s
      .from('categorias')
      .select('id, nombre, orden, activa, presupuesto')
      .order('orden')
      .order('nombre'),
    s
      .from('tipos_pago')
      .select('id, nombre, orden, activo')
      .order('orden')
      .order('nombre'),
    s.from('miembros').select('id, nombre, correo, es_admin, activo').order('nombre'),
    s.from('gastos').select('categoria_id, tipo_pago_id, autor_id'),
  ])
  const g = ok(gastos) as Record<string, string>[]
  const porCat = contar(g, 'categoria_id')
  const porPago = contar(g, 'tipo_pago_id')
  const porAutor = contar(g, 'autor_id')
  const filas = (
    lista: {
      id: string
      nombre: string
      orden: number
      activa?: boolean
      activo?: boolean
      presupuesto?: number | null
    }[],
    n: Map<string, number>,
  ): Fila[] =>
    lista.map((x) => ({
      id: x.id,
      nombre: x.nombre,
      orden: x.orden,
      activo: x.activa ?? x.activo ?? true,
      gastos: n.get(x.id) ?? 0,
      presupuesto: x.presupuesto == null ? null : Number(x.presupuesto),
    }))
  return {
    esAdmin: ctx.miembro.es_admin,
    yoId: ctx.miembro.id,
    categorias: filas(ok(cats), porCat),
    tiposPago: filas(ok(pagos), porPago),
    miembros: (
      ok(miembros) as {
        id: string
        nombre: string
        correo: string
        es_admin: boolean
        activo: boolean
      }[]
    ).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      correo: m.correo,
      esAdmin: m.es_admin,
      activo: m.activo,
      gastos: porAutor.get(m.id) ?? 0,
    })),
  }
}

/** Todas las filas del tipo, con la columna de activo normalizada a `activo`. */
async function listar(ctx: Contexto, tipo: Tipo) {
  const col = TIPOS[tipo].activo
  const filas = ok(
    await db(ctx).from(tipo).select(`id, nombre, orden, ${col}`),
  ) as unknown as Record<string, unknown>[]
  return filas.map((f) => ({
    id: f.id as string,
    nombre: f.nombre as string,
    orden: f.orden as number,
    activo: f[col] as boolean,
  }))
}

export async function crearElementoDe(ctx: Contexto, tipo: Tipo, nombre: string) {
  exigirAdmin(ctx)
  const lista = await listar(ctx, tipo)
  if (nombreDuplicado(nombre, lista)) throw new ErrorApp('VALIDACION', TIPOS[tipo].ya)
  const orden = Math.max(-1, ...lista.map((x) => x.orden)) + 1
  ok(await db(ctx).from(tipo).insert({ nombre, orden }))
  return obtenerAjustesDe(ctx)
}

export async function renombrarElementoDe(
  ctx: Contexto,
  tipo: Tipo,
  id: string,
  nombre: string,
) {
  exigirAdmin(ctx)
  const lista = await listar(ctx, tipo)
  if (!lista.some((x) => x.id === id)) throw new ErrorApp('NO_ENCONTRADO', MSG.noExiste)
  if (nombreDuplicado(nombre, lista, id)) throw new ErrorApp('VALIDACION', TIPOS[tipo].ya)
  ok(await db(ctx).from(tipo).update({ nombre }).eq('id', id))
  return obtenerAjustesDe(ctx)
}

export async function reordenarElementosDe(ctx: Contexto, tipo: Tipo, ids: string[]) {
  exigirAdmin(ctx)
  // ponytail: una actualización por fila, sin transacción; con 10-20 filas no importa.
  await Promise.all(
    ids.map(async (id, orden) =>
      ok(await db(ctx).from(tipo).update({ orden }).eq('id', id)),
    ),
  )
  return obtenerAjustesDe(ctx)
}

export async function activarElementoDe(
  ctx: Contexto,
  tipo: Tipo,
  id: string,
  activo: boolean,
) {
  exigirAdmin(ctx)
  const lista = await listar(ctx, tipo)
  if (!lista.some((x) => x.id === id)) throw new ErrorApp('NO_ENCONTRADO', MSG.noExiste)
  if (!quedaUnoActivo(lista, id, activo))
    throw new ErrorApp('VALIDACION', TIPOS[tipo].sinActivos)
  ok(
    await db(ctx)
      .from(tipo)
      .update({ [TIPOS[tipo].activo]: activo })
      .eq('id', id),
  )
  return obtenerAjustesDe(ctx)
}

export async function borrarElementoDe(ctx: Contexto, tipo: Tipo, id: string) {
  exigirAdmin(ctx)
  const lista = await listar(ctx, tipo)
  if (!lista.some((x) => x.id === id)) throw new ErrorApp('NO_ENCONTRADO', MSG.noExiste)
  const { count } = await db(ctx)
    .from('gastos')
    .select('id', { count: 'exact', head: true })
    .eq(TIPOS[tipo].fk, id)
  if (count) throw new ErrorApp('VALIDACION', TIPOS[tipo].conGastos)
  if (!quedaUnoActivo(lista, id, false))
    throw new ErrorApp('VALIDACION', TIPOS[tipo].sinActivos)
  ok(await db(ctx).from(tipo).delete().eq('id', id))
  return obtenerAjustesDe(ctx)
}

export async function fijarPresupuestoDe(
  ctx: Contexto,
  id: string,
  presupuesto: number | null,
) {
  exigirAdmin(ctx)
  const filas = ok(
    await db(ctx).from('categorias').update({ presupuesto }).eq('id', id).select('id'),
  ) as unknown[]
  if (!filas.length) throw new ErrorApp('NO_ENCONTRADO', MSG.noExiste)
  return obtenerAjustesDe(ctx)
}

export async function agregarMiembroDe(ctx: Contexto, correo: string, nombre: string) {
  exigirAdmin(ctx)
  const r = await db(ctx).from('miembros').insert({ correo, nombre })
  if (r.error?.code === '23505') throw new ErrorApp('VALIDACION', MSG.correoRepetido)
  ok(r)
  return obtenerAjustesDe(ctx)
}

export async function borrarMiembroDe(ctx: Contexto, id: string) {
  exigirAdmin(ctx)
  if (id === ctx.miembro.id) throw new ErrorApp('VALIDACION', MSG.borrarseASiMismo)
  const lista = (
    ok(await db(ctx).from('miembros').select('id, activo, es_admin')) as {
      id: string
      activo: boolean
      es_admin: boolean
    }[]
  ).map((m) => ({ id: m.id, activo: m.activo, esAdmin: m.es_admin }))
  // Borrar equivale a desactivar para la regla del último admin.
  const error = errorDeMiembro(lista, id, { activo: false }, ctx.miembro.id)
  if (error)
    throw new ErrorApp(
      lista.some((m) => m.id === id) ? 'VALIDACION' : 'NO_ENCONTRADO',
      error,
    )
  const { count } = await db(ctx)
    .from('gastos')
    .select('id', { count: 'exact', head: true })
    .eq('autor_id', id)
  if (count) throw new ErrorApp('VALIDACION', MSG.miembroConGastos)
  ok(await db(ctx).from('miembros').delete().eq('id', id))
  return obtenerAjustesDe(ctx)
}

export async function actualizarMiembroDe(
  ctx: Contexto,
  id: string,
  cambio: { nombre?: string; activo?: boolean; esAdmin?: boolean },
) {
  exigirAdmin(ctx)
  const lista = (
    ok(await db(ctx).from('miembros').select('id, activo, es_admin')) as {
      id: string
      activo: boolean
      es_admin: boolean
    }[]
  ).map((m) => ({ id: m.id, activo: m.activo, esAdmin: m.es_admin }))
  const error = errorDeMiembro(lista, id, cambio, ctx.miembro.id)
  if (error)
    throw new ErrorApp(
      lista.some((m) => m.id === id) ? 'VALIDACION' : 'NO_ENCONTRADO',
      error,
    )
  const { nombre, activo, esAdmin } = cambio
  ok(
    await db(ctx)
      .from('miembros')
      .update({
        ...(nombre !== undefined && { nombre }),
        ...(activo !== undefined && { activo }),
        ...(esAdmin !== undefined && { es_admin: esAdmin }),
      })
      .eq('id', id),
  )
  return obtenerAjustesDe(ctx)
}
