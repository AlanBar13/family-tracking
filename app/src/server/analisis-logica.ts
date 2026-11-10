import { z } from 'zod'
import { ESQUEMA_ANALISIS, instruccionAnalisis, resumenParaAnalisis } from '@/lib/analisis'
import { ErrorApp } from '@/lib/errores'
import { mesRelativo } from '@/lib/resumen'
import { llamarGemini } from './gemini'
import { obtenerEstadoDe } from './gastos-logica'
import type { Contexto } from './miembro'

export const MENSAJES_ANALISIS = {
  sinGastos: 'No hay gastos este mes para analizar.',
  sinLlave: 'El análisis con IA no está configurado.',
  saturado: 'Gemini está saturado o se acabó la cuota. Intenta en un minuto.',
  llave: 'La clave de Gemini no es válida.',
  ilegible: 'No pude interpretar la respuesta del modelo. Intenta de nuevo.',
  generico: 'No pude analizar los gastos en este momento. Intenta de nuevo.',
} as const

const esquemaRespuesta = z.object({
  diagnostico: z.string().max(600),
  recomendaciones: z
    .array(
      z.object({
        titulo: z.string().max(120),
        detalle: z.string().max(600),
        accion: z.string().max(250),
        ahorroMensual: z.number().min(0),
        prioridad: z.enum(['alta', 'media', 'baja']),
      }),
    )
    .min(1)
    .max(5),
})

/** Pide recomendaciones a Gemini sobre el mes. Solo lee; no escribe en la base. */
export async function analizarGastosDe(
  ctx: Contexto,
  mes: unknown,
  zona: string,
  o: { llave: string | undefined; modelo: string },
) {
  if (!o.llave) throw new ErrorApp('EXTERNO', MENSAJES_ANALISIS.sinLlave)
  const actual = await obtenerEstadoDe(ctx, mes, zona)
  if (!actual.gastos.length) throw new ErrorApp('VALIDACION', MENSAJES_ANALISIS.sinGastos)
  const anterior = await obtenerEstadoDe(ctx, mesRelativo(actual.mes, -1), zona)

  const crudo = await llamarGemini(
    {
      contents: [
        { role: 'user', parts: [{ text: resumenParaAnalisis(actual, anterior) }] },
      ],
      systemInstruction: { parts: [{ text: instruccionAnalisis() }] },
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: ESQUEMA_ANALISIS,
      },
    },
    { llave: o.llave, modelo: o.modelo, mensajes: MENSAJES_ANALISIS },
  )
  const r = esquemaRespuesta.safeParse(crudo)
  if (!r.success) {
    console.error('Gemini: forma inesperada', r.error)
    throw new ErrorApp('EXTERNO', MENSAJES_ANALISIS.ilegible)
  }
  return { diagnostico: r.data.diagnostico, recomendaciones: r.data.recomendaciones }
}
