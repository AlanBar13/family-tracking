import { ErrorApp } from '@/lib/errores'
import {
  ESQUEMA_TICKET,
  instruccionTicket,
  interpretarRespuesta,
  MAX_BYTES_FOTO,
  type PropuestaTicket,
} from '@/lib/ticket'

type Opcion = { id: string; nombre: string }

export const MENSAJES_TICKET = {
  pesa: 'La foto pesa demasiado. Intenta de nuevo con menos acercamiento.',
  sinLlave: 'El lector de tickets no está configurado.',
  saturado: 'Gemini está saturado o se acabó la cuota. Intenta en un minuto.',
  llave: 'La clave de Gemini no es válida.',
  ilegible: 'No pude interpretar la respuesta del modelo. Captura el gasto a mano.',
  generico: 'No pude leer el ticket en este momento. Captura el gasto a mano.',
} as const

/** Llama a Gemini y devuelve la propuesta. No escribe nada. `categorias`/`tiposPago`: solo activos. */
export async function leerTicketDe(
  base64: string,
  o: {
    llave: string | undefined
    modelo: string
    hoy: string
    categorias: Opcion[]
    tiposPago: Opcion[]
  },
): Promise<PropuestaTicket> {
  if (base64.length * 0.75 > MAX_BYTES_FOTO) throw new ErrorApp('VALIDACION', MENSAJES_TICKET.pesa)
  if (!o.llave) throw new ErrorApp('EXTERNO', MENSAJES_TICKET.sinLlave)

  const cuerpo = {
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          { text: 'Extrae los datos de este ticket.' },
        ],
      },
    ],
    systemInstruction: {
      parts: [
        {
          text: instruccionTicket({
            hoy: o.hoy,
            categorias: o.categorias.map((c) => c.nombre),
            tiposPago: o.tiposPago.map((t) => t.nombre),
          }),
        },
      ],
    },
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA_TICKET,
    },
  }

  let r: Response
  try {
    r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(o.modelo)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': o.llave },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(45_000),
      },
    )
  } catch (e) {
    console.error('Gemini: fallo de red o timeout', e)
    throw new ErrorApp('EXTERNO', MENSAJES_TICKET.generico)
  }

  const texto = await r.text()
  if (!r.ok) {
    let detalle = texto.slice(0, 200)
    try {
      detalle = JSON.parse(texto).error.message
    } catch {
      /* se queda el texto recortado */
    }
    console.error('Gemini respondió', r.status, detalle)
    if (r.status === 429) throw new ErrorApp('EXTERNO', MENSAJES_TICKET.saturado)
    if (r.status === 400 && /API key/i.test(detalle))
      throw new ErrorApp('EXTERNO', MENSAJES_TICKET.llave)
    throw new ErrorApp('EXTERNO', MENSAJES_TICKET.generico)
  }

  let crudo: Record<string, unknown>
  try {
    crudo = JSON.parse(JSON.parse(texto).candidates[0].content.parts[0].text)
    if (crudo === null || typeof crudo !== 'object') throw new Error('no es objeto')
  } catch (e) {
    console.error('Gemini: respuesta ilegible', e)
    throw new ErrorApp('EXTERNO', MENSAJES_TICKET.ilegible)
  }

  return interpretarRespuesta(crudo, o, o.hoy)
}
