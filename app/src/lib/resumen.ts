import { aCentavos, deCentavos } from './dinero'
import { PALETA } from './paleta'

export type Fila = { clave: string; total: number }

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** Suma por clave en centavos enteros (clave vacía → `Sin especificar`), de mayor a menor. */
export function acumular<T extends { monto: number }>(
  items: T[],
  clave: (x: T) => string | null | undefined,
): Fila[] {
  const mapa = new Map<string, number>()
  for (const x of items) {
    const k = clave(x) || 'Sin especificar'
    mapa.set(k, (mapa.get(k) ?? 0) + aCentavos(x.monto))
  }
  return [...mapa]
    .map(([k, centavos]) => ({ clave: k, total: deCentavos(centavos) }))
    .sort((a, b) => b.total - a.total)
}

/** Porcentaje entero del total. */
export const porcentaje = (monto: number, total: number) =>
  total ? Math.round((monto / total) * 100) : 0

/** Ancho (%) de una barra respecto a la mayor; mínimo 2 para que siempre se vea. */
export const anchoBarra = (monto: number, mayor: number) =>
  Math.max(mayor ? (monto / mayor) * 100 : 0, 2)

/** Color según la posición en el orden de las categorías (incluye las inactivas). */
export function colorCategoria(id: string, categorias: { id: string }[]): string {
  const i = categorias.findIndex((c) => c.id === id)
  return PALETA[(i === -1 ? categorias.length : i) % PALETA.length]!
}

export const colorPersona = (i: number) => PALETA[(i * 4 + 1) % PALETA.length]!

/** Nombre del miembro; si no hay, la parte del correo antes de la `@`. */
export function nombreDeMiembro(
  id: string,
  miembros: { id: string; nombre: string; correo?: string }[],
): string {
  const m = miembros.find((x) => x.id === id)
  return m?.nombre.trim() || m?.correo?.split('@')[0] || 'Sin especificar'
}

/** Agrupa gastos ya ordenados por fecha, conservando el orden. */
export function agruparPorDia<T extends { fecha: string }>(gastos: T[]) {
  const grupos: { fecha: string; gastos: T[] }[] = []
  for (const g of gastos) {
    const ultimo = grupos.at(-1)
    if (ultimo?.fecha === g.fecha) ultimo.gastos.push(g)
    else grupos.push({ fecha: g.fecha, gastos: [g] })
  }
  return grupos
}

/** `2026-03-02` → `lunes 2 de marzo`. */
export function etiquetaDia(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number]
  const dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]!
  return `${dia} ${d} de ${MESES[m - 1]}`
}

/** `2026-03` → `Marzo 2026`. */
export function etiquetaMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  const nombre = MESES[m - 1]!
  return `${nombre[0]!.toUpperCase()}${nombre.slice(1)} ${a}`
}

/** Mes `yyyy-MM` desplazado `delta` meses. */
export function mesRelativo(mes: string, delta: number): string {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  const t = a * 12 + (m - 1) + delta
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
