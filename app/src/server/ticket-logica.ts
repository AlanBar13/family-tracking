import { ErrorApp } from '@/lib/errores'
import {
  ESQUEMA_TICKET,
  instruccionTicket,
  interpretarRespuesta,
  MAX_BYTES_FOTO,
  type PropuestaTicket,
} from '@/lib/ticket'

import { llamarGemini } from './gemini'

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

  const crudo = await llamarGemini(cuerpo, {
    llave: o.llave,
    modelo: o.modelo,
    mensajes: MENSAJES_TICKET,
  })

  return interpretarRespuesta(crudo, o, o.hoy)
}
