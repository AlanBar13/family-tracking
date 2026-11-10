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
    const compras = actual.gastos.filter((g) => g.categoriaId === f.clave).length
    return `- ${nombreCat(f.clave)}: ${dinero(f.total)} (${porcentaje(f.total, totalA)}% del total, ${compras} compras)${presupuesto}; vs mes anterior ${cambio(f.total, previoPorCat.get(f.clave) ?? 0)}`
  })
  const lineasTipo = acumular(actual.gastos, (g) => g.tipoPagoId).map(
    (f) =>
      `- ${nombreTipo(f.clave)}: ${dinero(f.total)} (${porcentaje(f.total, totalA)}%); vs mes anterior ${cambio(f.total, previoPorTipo.get(f.clave) ?? 0)}`,
  )
  const grandes = [...actual.gastos]
    .sort((a, b) => aCentavos(b.monto) - aCentavos(a.monto))
    .slice(0, MAX_GRANDES)
    .map((g) => `- ${linea(g.nombre)}: ${dinero(g.monto)} (${g.fecha})`)

  const [anio, mesNum] = actual.mes.split('-').map(Number) as [number, number]
  const diasMes = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate()
  const enCurso = actual.hoy.startsWith(actual.mes)
  const dias = enCurso ? Number(actual.hoy.slice(8, 10)) : diasMes
  const conPresu = categorias.filter((c) => c.presupuesto)
  const presuTotal = sumar(conPresu.map((c) => c.presupuesto ?? 0))
  const gastadoPresu = sumar(
    actual.gastos.filter((g) => conPresu.some((c) => c.id === g.categoriaId)).map((g) => g.monto),
  )

  return [
    `Mes analizado: ${etiquetaMes(actual.mes)}. Gastos: ${actual.gastos.length}.`,
    `Total del mes: ${dinero(totalA)}. Mes anterior (${etiquetaMes(anterior.mes)}): ${dinero(totalP)} (${cambio(totalA, totalP)}).`,
    `Promedio diario: ${dinero(totalA / dias)}.`,
    ...(enCurso
      ? [`Mes en curso: día ${dias} de ${diasMes}; proyección al cierre ${dinero((totalA / dias) * diasMes)}.`]
      : []),
    ...(conPresu.length
      ? [
          `Presupuesto total: ${dinero(presuTotal)}; gastado en categorías con presupuesto: ${dinero(gastadoPresu)} (${porcentaje(gastadoPresu, presuTotal)}%).`,
        ]
      : []),
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
    'Eres un asesor financiero del hogar en México. Recibes el resumen de gastos de un mes y lo comparas con el mes anterior.',
    '',
    'Método:',
    '- diagnostico: resumen ejecutivo de 2 a 3 oraciones con el dato más relevante (tendencia vs mes anterior, proyección si el mes va en curso, presupuestos excedidos).',
    '- recomendaciones: de 3 a 5, ordenadas por impacto. Prioriza presupuestos excedidos, categorías que más crecieron y gastos hormiga (muchas compras pequeñas).',
    '- titulo: frase corta (máximo 60 caracteres). detalle: 1 a 3 oraciones con montos y categorías del resumen.',
    '- accion: un paso concreto y medible para esta semana o este mes (ej. "fijar tope de $X en ...").',
    '- ahorroMensual: estimado realista en MXN basado solo en los montos del resumen (0 si no aplica).',
    '- prioridad: alta, media o baja según el impacto.',
    '',
    'No inventes datos que no estén en el resumen. No recomiendes productos financieros ni inversiones.',
    'Usa español de México, con tono profesional y claro.',
    '',
    'Responde únicamente con el JSON pedido.',
  ].join('\n')

export const ESQUEMA_ANALISIS = {
  type: 'OBJECT',
  properties: {
    diagnostico: { type: 'STRING' },
    recomendaciones: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          titulo: { type: 'STRING' },
          detalle: { type: 'STRING' },
          accion: { type: 'STRING' },
          ahorroMensual: { type: 'NUMBER' },
          prioridad: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
        },
        required: ['titulo', 'detalle', 'accion', 'ahorroMensual', 'prioridad'],
      },
    },
  },
  required: ['diagnostico', 'recomendaciones'],
} as const
