// Lógica pura de la migración desde Google Sheets (paso 11). Sin red ni disco.

export type FilaCsv = Record<string, string>

export type GastoImportado = {
  id: string
  nombre: string
  monto: number
  fecha: string
  categoria: string
  autor: string
  tipoPago: string
  notas: string
}

export type Omitida = { fila: number; motivo: string }

export type ConfigImportada = {
  categorias: string[]
  tiposPago: string[]
  personas: { correo: string; nombre: string }[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CORREO = /^[^@\s]+@[^@\s]+$/

/**
 * `$1,234.50` → 1234.5 y `499,62` / `1.234,5` → 499.62 / 1234.5. `null` si no es un número.
 * Una coma seguida de 1–2 dígitos al final es decimal; con 3 dígitos (`1,234`) es de miles.
 */
export function parsearMonto(texto: string): number | null {
  const t = texto.replace(/[$\s]/g, '')
  const limpio = /,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return null
  return Math.round(Number(limpio) * 100) / 100
}

function fechaReal(a: number, m: number, d: number): string | null {
  const iso = `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const f = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(f.getTime()) && f.toISOString().slice(0, 10) === iso ? iso : null
}

/**
 * `yyyy-MM-dd` (con hora opcional), `yyyy/M/d` o local `d/M/yyyy` (día primero, como en México).
 * `null` si es ilegible o no existe en el calendario.
 */
export function parsearFecha(texto: string): string | null {
  const t = texto.trim()
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/.exec(t)
  if (m) return fechaReal(+m[1]!, +m[2]!, +m[3]!)
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s].*)?$/.exec(t)
  if (m) return fechaReal(+m[3]!, +m[2]!, +m[1]!)
  return null
}

function requerirColumnas(filas: FilaCsv[], columnas: string[], archivo: string) {
  const primera = filas[0]
  if (!primera) return
  const faltan = columnas.filter((c) => !(c in primera))
  if (faltan.length) throw new Error(`${archivo}: faltan las columnas ${faltan.join(', ')}.`)
}

/** Igual que `leerConfig_` de Codigo.gs: listas independientes por columna, celdas vacías fuera. */
export function leerConfig(filas: FilaCsv[]): ConfigImportada {
  requerirColumnas(filas, ['Categorías', 'Tipos de pago', 'Correo', 'Nombre'], 'Config.csv')
  const cfg: ConfigImportada = { categorias: [], tiposPago: [], personas: [] }
  for (const f of filas) {
    const cat = f['Categorías']!.trim()
    const pago = f['Tipos de pago']!.trim()
    const correo = f['Correo']!.trim().toLowerCase()
    if (cat) cfg.categorias.push(cat)
    if (pago) cfg.tiposPago.push(pago)
    if (correo) cfg.personas.push({ correo, nombre: f['Nombre']!.trim() || correo.split('@')[0]! })
  }
  return cfg
}

/** Filas sin ID se ignoran (`sinId`); las inválidas se reportan con su número de fila del CSV. */
export function leerGastos(filas: FilaCsv[]) {
  requerirColumnas(
    filas,
    ['ID', 'Nombre del gasto', 'Monto', 'Fecha', 'Categoría', 'Quién lo subió', 'Tipo de pago', 'Notas'],
    'Gastos.csv',
  )
  const gastos: GastoImportado[] = []
  const omitidas: Omitida[] = []
  let sinId = 0
  const vistos = new Set<string>()

  filas.forEach((f, i) => {
    const fila = i + 2 // la fila 1 son los encabezados
    const id = f['ID']!.trim().toLowerCase()
    if (!id) return void sinId++
    const nombre = f['Nombre del gasto']!.trim()
    const monto = parsearMonto(f['Monto']!)
    const fecha = parsearFecha(f['Fecha']!)
    const categoria = f['Categoría']!.trim()
    const tipoPago = f['Tipo de pago']!.trim()
    const autor = f['Quién lo subió']!.trim().toLowerCase()

    const motivo = !UUID.test(id)
      ? 'El ID no es un UUID.'
      : vistos.has(id)
        ? 'ID repetido en el archivo.'
        : !nombre
          ? 'Nombre vacío.'
          : nombre.length > 120
            ? 'Nombre de más de 120 caracteres.'
            : monto === null || monto <= 0
              ? `Monto inválido: "${f['Monto']}".`
              : !fecha
                ? `Fecha ilegible: "${f['Fecha']}".`
                : !categoria
                  ? 'Categoría vacía.'
                  : !tipoPago
                    ? 'Tipo de pago vacío.'
                    : !CORREO.test(autor)
                      ? `Autor inválido: "${f['Quién lo subió']}".`
                      : null
    if (motivo) return void omitidas.push({ fila, motivo })

    vistos.add(id)
    gastos.push({
      id,
      nombre,
      monto: monto!,
      fecha: fecha!,
      categoria,
      autor,
      tipoPago,
      notas: f['Notas']!.trim().slice(0, 500),
    })
  })
  return { gastos, omitidas, sinId }
}

/** Clave de comparación de nombres: sin mayúsculas ni espacios de más. */
export const clave = (nombre: string) => nombre.trim().toLowerCase()

/**
 * Nombres a crear para una tabla de catálogo: primero los de Config (activos, en su orden),
 * luego los que solo aparecen en los gastos (inactivos). Quita duplicados sin importar mayúsculas.
 */
export function planearCatalogo(deConfig: string[], deGastos: string[]) {
  const vistos = new Set<string>()
  const salida: { nombre: string; activo: boolean }[] = []
  for (const [lista, activo] of [
    [deConfig, true],
    [deGastos, false],
  ] as const) {
    for (const nombre of lista) {
      if (vistos.has(clave(nombre))) continue
      vistos.add(clave(nombre))
      salida.push({ nombre, activo })
    }
  }
  return salida
}

/** Miembros: los de Config activos; los autores desconocidos, inactivos. Ninguno admin aquí. */
export function planearMiembros(personas: ConfigImportada['personas'], autores: string[]) {
  const porCorreo = new Map<string, { correo: string; nombre: string; activo: boolean }>()
  for (const p of personas) if (!porCorreo.has(p.correo)) porCorreo.set(p.correo, { ...p, activo: true })
  for (const c of autores)
    if (!porCorreo.has(c)) porCorreo.set(c, { correo: c, nombre: c.split('@')[0]!, activo: false })
  return [...porCorreo.values()]
}

/** Total por mes (`yyyy-MM`) en centavos enteros. */
export function totalesPorMes(items: { fecha: string; monto: number }[]) {
  const t = new Map<string, number>()
  for (const { fecha, monto } of items) {
    const mes = fecha.slice(0, 7)
    t.set(mes, (t.get(mes) ?? 0) + Math.round(monto * 100))
  }
  return t
}
