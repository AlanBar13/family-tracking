const MES = /^\d{4}-(0[1-9]|1[0-2])$/
const DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/** Partes de un instante vistas en `zona` (nunca la hora local del servidor). */
function partes(zona: string, instante: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  )
  return { a: p.year!, m: p.month!, d: p.day! }
}

/** `yyyy-MM-dd` de hoy en la zona del hogar. */
export function hoyEnZona(zona: string, ahora: Date = new Date()): string {
  const { a, m, d } = partes(zona, ahora)
  return `${a}-${m}-${d}`
}

/** `yyyy-MM` del mes actual en la zona del hogar. */
export function mesActual(zona: string, ahora: Date = new Date()): string {
  return hoyEnZona(zona, ahora).slice(0, 7)
}

export function esMesValido(texto: unknown): texto is string {
  return typeof texto === 'string' && MES.test(texto)
}

/** Fecha `yyyy-MM-dd` que existe en el calendario (rechaza 2026-02-30). */
export function esFechaValida(texto: unknown): texto is string {
  if (typeof texto !== 'string' || !DIA.test(texto)) return false
  const f = new Date(`${texto}T00:00:00Z`)
  return !Number.isNaN(f.getTime()) && f.toISOString().slice(0, 10) === texto
}

/** Mes válido o, si no lo es, el mes actual. */
export function normalizarMes(texto: unknown, zona: string, ahora?: Date): string {
  return esMesValido(texto) ? texto : mesActual(zona, ahora)
}

/** Primer día del mes y primer día del siguiente (`hasta` es exclusivo). */
export function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  const sig = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
  return { desde: `${mes}-01`, hasta: `${sig}-01` }
}

/** Unión de meses con gastos y el mes actual, sin duplicados, de más nuevo a más viejo. */
export function listaDeMeses(mesesConGastos: string[], actual: string): string[] {
  return [...new Set([...mesesConGastos, actual])].sort().reverse()
}

/** Hoy si se ve el mes actual; si no, el día 1 del mes visto. */
export function fechaPorOmision(mesVisto: string, hoy: string): string {
  return mesVisto === hoy.slice(0, 7) ? hoy : `${mesVisto}-01`
}
