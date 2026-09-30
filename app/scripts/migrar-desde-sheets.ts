// Importa a Supabase los CSV exportados del Google Sheet anterior (paso 11).
//
//   pnpm migrar                                     → dry-run (no escribe)
//   pnpm migrar --aplicar --destino=dev             → escribe, pide confirmar
//   pnpm migrar --aplicar --destino=prod --admin=tu@correo
//   pnpm migrar --dir=scripts/__fixtures__          → CSV de ejemplo
//
// Es el único lugar que usa SUPABASE_SERVICE_ROLE_KEY (se salta RLS): solo local.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/database.types.ts'
import {
  clave,
  leerConfig,
  leerGastos,
  planearCatalogo,
  planearMiembros,
  totalesPorMes,
  type FilaCsv,
} from '../src/lib/migracion.ts'

const LOTE = 500
const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const aplicar = process.argv.includes('--aplicar')
const destino = arg('destino')
const admin = arg('admin')?.trim().toLowerCase()
const dir = arg('dir') ?? 'migracion'

function salir(mensaje: string): never {
  console.error(`\n✖ ${mensaje}`)
  process.exit(1)
}

const url = process.env.VITE_SUPABASE_URL
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !llave) salir('Faltan VITE_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en app/.env.')
if (aplicar && destino !== 'dev' && destino !== 'prod') salir('Con --aplicar indica --destino=dev o --destino=prod.')
if (admin && !/^[^@\s]+@[^@\s]+$/.test(admin)) salir('--admin debe ser un correo.')

const db = createClient<Database>(url, llave, { auth: { persistSession: false } })

function leerCsv(archivo: string): FilaCsv[] {
  try {
    return parse(readFileSync(`${dir}/${archivo}`), { columns: true, bom: true, skip_empty_lines: true, relax_column_count: true })
  } catch (e) {
    return salir(`No pude leer ${dir}/${archivo}: ${e instanceof Error ? e.message : e}`)
  }
}

/** Lee todas las filas de una tabla (Supabase corta en 1000 por consulta). */
async function leerTodo<T extends 'categorias' | 'tipos_pago' | 'miembros' | 'gastos'>(tabla: T, columnas: string) {
  const filas: Record<string, unknown>[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db.from(tabla).select(columnas).order('id').range(desde, desde + 999)
    if (error) salir(`Error leyendo ${tabla}: ${error.message}`)
    filas.push(...(data as unknown as Record<string, unknown>[]))
    if (data.length < 1000) return filas
  }
}

const dinero = (centavos: number) => `$${(centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

// ---------------------------------------------------------------- lectura y plan
const config = leerConfig(leerCsv('Config.csv'))
const { gastos, omitidas, sinId } = leerGastos(leerCsv('Gastos.csv'))
console.log(`CSV: ${gastos.length} gastos válidos, ${omitidas.length} omitidos, ${sinId} sin ID ignorados.`)

const personas = [...config.personas]
if (admin && !personas.some((p) => p.correo === admin)) personas.push({ correo: admin, nombre: admin.split('@')[0]! })

const planCategorias = planearCatalogo(config.categorias, gastos.map((g) => g.categoria))
const planPagos = planearCatalogo(config.tiposPago, gastos.map((g) => g.tipoPago))
const planMiembros = planearMiembros(personas, gastos.map((g) => g.autor))

console.log('Leyendo la base actual…')
const [cats, pagos, miembros, idsGastos] = await Promise.all([
  leerTodo('categorias', 'id,nombre,orden'),
  leerTodo('tipos_pago', 'id,nombre,orden'),
  leerTodo('miembros', 'id,correo'),
  leerTodo('gastos', 'id'),
])
const existeCat = new Set(cats.map((c) => clave(c.nombre as string)))
const existePago = new Set(pagos.map((c) => clave(c.nombre as string)))
const existeMiembro = new Set(miembros.map((m) => m.correo as string))
const existeGasto = new Set(idsGastos.map((g) => g.id as string))

const nuevasCats = planCategorias.filter((c) => !existeCat.has(clave(c.nombre)))
const nuevosPagos = planPagos.filter((c) => !existePago.has(clave(c.nombre)))
const nuevosMiembros = planMiembros.filter((m) => !existeMiembro.has(m.correo))
const gastosNuevos = gastos.filter((g) => !existeGasto.has(g.id))

const resumen = [
  ['Categorías', nuevasCats.length, planCategorias.length - nuevasCats.length, 0],
  ['Tipos de pago', nuevosPagos.length, planPagos.length - nuevosPagos.length, 0],
  ['Miembros', nuevosMiembros.length, planMiembros.length - nuevosMiembros.length, 0],
  ['Gastos', gastosNuevos.length, gastos.length - gastosNuevos.length, omitidas.length],
] as const

// ---------------------------------------------------------------- escritura
const csvPorMes = totalesPorMes(gastos)
let dbPorMes: Map<string, number> | null = null

if (aplicar) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const r = await rl.question(`\nVas a ESCRIBIR en ${new URL(url).host} (destino: ${destino}).\nEscribe "${destino}" para continuar: `)
  rl.close()
  if (r.trim() !== destino) salir('Confirmación incorrecta; no se escribió nada.')

  const ordenBase = (filas: Record<string, unknown>[]) => Math.max(0, ...filas.map((f) => f.orden as number))
  const insertar = async (tabla: 'categorias' | 'tipos_pago' | 'miembros', filas: object[]) => {
    if (!filas.length) return
    console.log(`Creando ${filas.length} en ${tabla}…`)
    const { error } = await db.from(tabla).insert(filas as never)
    if (error) salir(`Error en ${tabla}: ${error.message}`)
  }
  const ordenCat = ordenBase(cats)
  const ordenPago = ordenBase(pagos)
  await insertar('categorias', nuevasCats.map((c, i) => ({ nombre: c.nombre, activa: c.activo, orden: ordenCat + i + 1 })))
  await insertar('tipos_pago', nuevosPagos.map((c, i) => ({ nombre: c.nombre, activo: c.activo, orden: ordenPago + i + 1 })))
  await insertar('miembros', nuevosMiembros.map((m) => ({ ...m, es_admin: m.correo === admin })))

  const mapa = (filas: Record<string, unknown>[], campo: string, f: (s: string) => string) =>
    new Map(filas.map((x) => [f(x[campo] as string), x.id as string]))
  const catId = mapa(await leerTodo('categorias', 'id,nombre'), 'nombre', clave)
  const pagoId = mapa(await leerTodo('tipos_pago', 'id,nombre'), 'nombre', clave)
  const autorId = mapa(await leerTodo('miembros', 'id,correo'), 'correo', (s) => s)

  for (let i = 0; i < gastos.length; i += LOTE) {
    const lote = gastos.slice(i, i + LOTE).map((g) => ({
      id: g.id,
      nombre: g.nombre,
      monto: g.monto,
      fecha: g.fecha,
      notas: g.notas,
      categoria_id: catId.get(clave(g.categoria))!,
      tipo_pago_id: pagoId.get(clave(g.tipoPago))!,
      autor_id: autorId.get(g.autor)!,
    }))
    const { error } = await db.from('gastos').upsert(lote, { onConflict: 'id' })
    if (error) salir(`Error en el lote de gastos ${i + 1}–${i + lote.length}: ${error.message}`)
    console.log(`Gastos: ${Math.min(i + LOTE, gastos.length)}/${gastos.length}`)
  }

  const ids = new Set(gastos.map((g) => g.id))
  const enBase = (await leerTodo('gastos', 'id,fecha,monto')).filter((g) => ids.has(g.id as string))
  dbPorMes = totalesPorMes(enBase as { fecha: string; monto: number }[])
}

// ---------------------------------------------------------------- reporte
const meses = [...new Set([...csvPorMes.keys(), ...(dbPorMes?.keys() ?? [])])].sort()
const coincide = dbPorMes !== null && meses.every((m) => csvPorMes.get(m) === dbPorMes!.get(m))

const lineas = [
  `# Reporte de migración — ${new Date().toISOString()}`,
  '',
  aplicar ? `**Modo:** aplicado en \`${destino}\` (${new URL(url).host})` : '**Modo:** dry-run (no se escribió nada)',
  '',
  '| | Creados | Reutilizados | Omitidos |',
  '|---|---:|---:|---:|',
  ...resumen.map(([n, c, r, o]) => `| ${n} | ${c} | ${r} | ${o} |`),
  '',
  `Filas sin ID ignoradas: ${sinId}.`,
  '',
  '## Filas omitidas',
  ...(omitidas.length ? omitidas.map((o) => `- Fila ${o.fila}: ${o.motivo}`) : ['Ninguna.']),
  '',
  '## Total por mes (CSV contra base)',
  '| Mes | CSV | Base | |',
  '|---|---:|---:|---|',
  ...meses.map((m) => {
    const c = csvPorMes.get(m) ?? 0
    const b = dbPorMes?.get(m)
    return `| ${m} | ${dinero(c)} | ${b === undefined ? (aplicar ? dinero(0) : '—') : dinero(b)} | ${!aplicar ? '' : b === c ? '✅' : '❌'} |`
  }),
  ...(aplicar ? ['', coincide ? 'Los totales coinciden.' : '**Los totales NO coinciden.**'] : []),
]
const texto = lineas.join('\n')
console.log(`\n${texto}\n`)

mkdirSync('migracion', { recursive: true })
const archivo = `migracion/reporte-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.md`
writeFileSync(archivo, texto + '\n')
console.log(`Reporte guardado en ${archivo}`)
if (aplicar && !coincide) process.exit(1)
