import { esFechaValida } from './fechas'

export const MAX_BYTES_FOTO = 4 * 1024 * 1024
export const MODELO_PREDETERMINADO = 'gemini-3.5-flash-lite'

/** Texto (copiado de `instruccion_()` en Ticket.gs) y esquema del lector. */
export function instruccionTicket(c: {
  hoy: string
  categorias: string[]
  tiposPago: string[]
}): string {
  return [
    'Eres un lector de tickets de compra mexicanos. Analiza la foto y extrae los datos del gasto.',
    '',
    'Reglas:',
    '- total: el TOTAL realmente pagado, ya con IVA y propina incluidos. No el subtotal.',
    '  Si el ticket viene en otra moneda, conviértelo a pesos no; deja el número tal cual y anótalo en nota.',
    '- comercio: nombre corto y legible del negocio (máximo 40 caracteres). Si no aparece, describe la compra.',
    '- fecha: la fecha impresa en el ticket, en formato yyyy-MM-dd. Si no es legible, usa ' +
      c.hoy +
      '.',
    '- categoria: elige exactamente una de esta lista: ' + c.categorias.join(', ') + '.',
    '- tipoPago: elige exactamente uno de esta lista: ' + c.tiposPago.join(', ') + '.',
    '  Busca pistas como TARJETA, TDC, TDD, VISA, MASTERCARD, EFECTIVO, CAMBIO, SPEI, TRANSFERENCIA.',
    '  Si el ticket dice CAMBIO o EFECTIVO, es efectivo. Si no hay ninguna pista, usa ' +
      (c.tiposPago[0] || 'Efectivo') +
      '.',
    '- confianza: "alta" si leíste el total con claridad, "media" si dudaste, "baja" si la foto casi no se lee.',
    '- nota: una frase corta solo si hay algo que el usuario deba revisar (propina, pagos mixtos, foto borrosa). Si no, cadena vacía.',
    '',
    'La fecha de hoy es ' + c.hoy + '. Responde únicamente con el JSON pedido.',
  ].join('\n')
}

export const ESQUEMA_TICKET = {
  type: 'OBJECT',
  properties: {
    comercio: { type: 'STRING' },
    total: { type: 'NUMBER' },
    fecha: { type: 'STRING' },
    categoria: { type: 'STRING' },
    tipoPago: { type: 'STRING' },
    confianza: { type: 'STRING' },
    nota: { type: 'STRING' },
  },
  required: ['comercio', 'total', 'fecha', 'categoria', 'tipoPago', 'confianza'],
} as const

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/** Empata un texto contra una lista sin acentos ni mayúsculas: exacto, luego "contiene". */
export function empatar<T>(valor: unknown, lista: T[], texto: (x: T) => string, respaldo: T): T
export function empatar(valor: unknown, lista: string[], respaldo: string): string
export function empatar<T>(
  valor: unknown,
  lista: T[],
  a: ((x: T) => string) | T,
  b?: T,
): T {
  const texto = (typeof a === 'function' ? a : (x: T) => String(x)) as (x: T) => string
  const respaldo = typeof a === 'function' ? (b as T) : a
  const objetivo = norm(valor)
  return (
    lista.find((x) => norm(texto(x)) === objetivo) ??
    (objetivo ? lista.find((x) => norm(texto(x)).includes(objetivo)) : undefined) ??
    respaldo
  )
}

type Opcion = { id: string; nombre: string }

export type PropuestaTicket = {
  nombre: string
  monto: number
  fecha: string
  categoriaId: string
  tipoPagoId: string
  aviso: string
}

/** Posprocesado de la respuesta cruda del modelo (CONTEXTO §2.5). Las listas son las activas. */
export function interpretarRespuesta(
  crudo: Record<string, unknown>,
  config: { categorias: Opcion[]; tiposPago: Opcion[] },
  hoy: string,
): PropuestaTicket {
  const texto = (v: unknown) => (typeof v === 'string' ? v : '')
  const monto = Math.round((Number(crudo.total) || 0) * 100) / 100
  const fecha = esFechaValida(crudo.fecha) ? crudo.fecha : hoy

  let aviso = texto(crudo.nota)
  if (!monto) aviso = 'No pude leer el total. Escríbelo a mano.'
  else if (texto(crudo.confianza).toLowerCase() === 'baja')
    aviso = 'La foto se lee mal, revisa bien los datos.'
  if (!aviso) aviso = 'Revisa los datos antes de guardar'

  const n = (o: Opcion) => o.nombre
  return {
    nombre: texto(crudo.comercio).slice(0, 60),
    monto,
    fecha,
    categoriaId: empatar(crudo.categoria, config.categorias, n, config.categorias[0]!)?.id ?? '',
    tipoPagoId: empatar(crudo.tipoPago, config.tiposPago, n, config.tiposPago[0]!)?.id ?? '',
    aviso,
  }
}
