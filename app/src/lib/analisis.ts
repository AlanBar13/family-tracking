import type { Estado } from '@/server/gastos-logica'
import { aCentavos, dinero, sumar } from './dinero'
import { acumular, etiquetaMes, porcentaje } from './resumen'

const SIN = 'Sin especificar'
const MAX_GRANDES = 10

/** Texto libre en una sola línea y recortado, para que no inyecte líneas al resumen. */
const linea = (t: string) => t.replace(/\s+/g, ' ').trim().slice(0, 120)

/** Cambio vs el mes anterior en texto ("+20%", "-5%", "nuevo"). */
function cambio(actual: number, anterior: number): string {
  if (!anterior) return actual ? 'nuevo' : 'sin cambio'
  const p = Math.round(((aCentavos(actual) - aCentavos(anterior)) / aCentavos(anterior)) * 100)
  return `${p > 0 ? '+' : ''}${p}%`
}

/**
 * Resumen compacto en texto para el modelo. Sin correos ni nombres de miembros:
 * solo categorías, tipos de pago, montos y nombres de los gastos.
 */
export function resumenParaAnalisis(actual: Estado, anterior: Estado): string {
  const totalA = sumar(actual.gastos.map((g) => g.monto))
  const totalP = sumar(anterior.gastos.map((g) => g.monto))
  const { categorias, tiposPago } = actual.config
  const nombreCat = (id: string) => linea(categorias.find((c) => c.id === id)?.nombre ?? SIN)
  const nombreTipo = (id: string) => linea(tiposPago.find((t) => t.id === id)?.nombre ?? SIN)

  const previoPorCat = new Map(acumular(anterior.gastos, (g) => g.categoriaId).map((f) => [f.clave, f.total]))
  const previoPorTipo = new Map(acumular(anterior.gastos, (g) => g.tipoPagoId).map((f) => [f.clave, f.total]))

  const lineasCat = acumular(actual.gastos, (g) => g.categoriaId).map((f) => {
    const presu = categorias.find((c) => c.id === f.clave)?.presupuesto
    const presupuesto = presu
      ? `, presupuesto ${dinero(presu)} (${porcentaje(f.total, presu)}% usado)`
      : ''
    return `- ${nombreCat(f.clave)}: ${dinero(f.total)} (${porcentaje(f.total, totalA)}% del total)${presupuesto}; vs mes anterior ${cambio(f.total, previoPorCat.get(f.clave) ?? 0)}`
  })
  const lineasTipo = acumular(actual.gastos, (g) => g.tipoPagoId).map(
    (f) =>
      `- ${nombreTipo(f.clave)}: ${dinero(f.total)} (${porcentaje(f.total, totalA)}%); vs mes anterior ${cambio(f.total, previoPorTipo.get(f.clave) ?? 0)}`,
  )
  const grandes = [...actual.gastos]
    .sort((a, b) => aCentavos(b.monto) - aCentavos(a.monto))
    .slice(0, MAX_GRANDES)
    .map((g) => `- ${linea(g.nombre)}: ${dinero(g.monto)} (${g.fecha})`)

  return [
    `Mes analizado: ${etiquetaMes(actual.mes)}. Gastos: ${actual.gastos.length}.`,
    `Total del mes: ${dinero(totalA)}. Mes anterior (${etiquetaMes(anterior.mes)}): ${dinero(totalP)} (${cambio(totalA, totalP)}).`,
    '',
    'Por categoría:',
    ...lineasCat,
    '',
    'Por tipo de pago:',
    ...lineasTipo,
    '',
    `Los ${grandes.length} gastos más grandes:`,
    ...grandes,
  ].join('\n')
}

export const instruccionAnalisis = (): string =>
  [
    'Eres un asesor de finanzas del hogar en México. Recibes el resumen de gastos de un mes y lo comparas con el mes anterior.',
    '',
    'Reglas:',
    '- Da de 3 a 5 recomendaciones concretas para ahorrar o gastar mejor.',
    '- Cita montos y categorías del resumen (en pesos mexicanos). No inventes datos que no estén en el resumen.',
    '- titulo: frase corta (máximo 60 caracteres).',
    '- detalle: 1 a 3 oraciones, en español de México, con tono amable y práctico.',
    '',
    'Responde únicamente con el JSON pedido.',
  ].join('\n')

export const ESQUEMA_ANALISIS = {
  type: 'OBJECT',
  properties: {
    recomendaciones: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { titulo: { type: 'STRING' }, detalle: { type: 'STRING' } },
        required: ['titulo', 'detalle'],
      },
    },
  },
  required: ['recomendaciones'],
} as const
