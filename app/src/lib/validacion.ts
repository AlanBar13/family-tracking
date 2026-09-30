import { z } from 'zod'
import { esFechaValida } from './fechas'
import { MENSAJES } from './mensajes'

const texto = z.string().trim()

export const gastoEntrada = z.object({
  nombre: texto.min(1, MENSAJES.nombreVacio).max(120, MENSAJES.nombreLargo),
  monto: z
    .number(MENSAJES.montoInvalido)
    .refine(Number.isFinite, MENSAJES.montoInvalido)
    .transform((n) => Math.round(n * 100) / 100)
    .refine((n) => n > 0, MENSAJES.montoInvalido),
  fecha: z.string(MENSAJES.fechaInvalida).refine(esFechaValida, MENSAJES.fechaInvalida),
  categoriaId: z.uuid(MENSAJES.categoriaInvalida),
  tipoPagoId: z.uuid(MENSAJES.tipoPagoInvalido),
  notas: texto.max(500, MENSAJES.notasLargas).default(''),
})

export type GastoEntrada = z.infer<typeof gastoEntrada>

/** Primer mensaje de un error de Zod, listo para mostrar. */
export function aErrorVisible(error: z.ZodError): string {
  return error.issues[0]?.message ?? MENSAJES.interno
}
