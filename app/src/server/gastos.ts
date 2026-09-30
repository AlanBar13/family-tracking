import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { aErrorApp, ErrorApp, paraCliente } from '@/lib/errores'
import { MENSAJES } from '@/lib/mensajes'
import { aErrorVisible, gastoEntrada } from '@/lib/validacion'
import {
  actualizarGastoDe,
  agregarGastoDe,
  borrarGastoDe,
  obtenerEstadoDe,
} from './gastos-logica'
import { requerirMiembro } from './requerir-miembro'

const zona = () => process.env.HOGAR_ZONA_HORARIA || 'America/Mexico_City'

/**
 * El `inputValidator` solo tipa la entrada; la validación real corre dentro de
 * `ejecutar` para que un fallo salga como ErrorApp `VALIDACION` (lanzado desde
 * el validador, TanStack lo entrega sin `codigo`).
 */
function entrada<T extends z.ZodType>(esquema: T) {
  return {
    tipar: (x: unknown) => x as z.input<T>,
    validar: (x: unknown): z.output<T> => {
      const r = esquema.safeParse(x)
      if (!r.success) throw new ErrorApp('VALIDACION', aErrorVisible(r.error))
      return r.data
    },
  }
}

/** Todo error sale como `Error('[CODIGO] mensaje')`; nunca el texto crudo ni el stack. */
async function ejecutar<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f()
  } catch (e) {
    throw paraCliente(aErrorApp(e))
  }
}

const id = z.uuid(MENSAJES.gastoNoExiste)

const eEstado = entrada(z.object({ mes: z.string().optional() }))
const eAgregar = entrada(gastoEntrada)
const eActualizar = entrada(gastoEntrada.extend({ id }))
const eBorrar = entrada(z.object({ id, mes: z.string() }))

export const obtenerEstado = createServerFn({ method: 'GET' })
  .inputValidator(eEstado.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eEstado.validar(data)
      return obtenerEstadoDe(await requerirMiembro(), d.mes, zona())
    }),
  )

export const agregarGasto = createServerFn({ method: 'POST' })
  .inputValidator(eAgregar.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eAgregar.validar(data)
      return agregarGastoDe(await requerirMiembro(), d, zona())
    }),
  )

export const actualizarGasto = createServerFn({ method: 'POST' })
  .inputValidator(eActualizar.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eActualizar.validar(data)
      return actualizarGastoDe(await requerirMiembro(), d, zona())
    }),
  )

export const borrarGasto = createServerFn({ method: 'POST' })
  .inputValidator(eBorrar.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eBorrar.validar(data)
      return borrarGastoDe(await requerirMiembro(), d, zona())
    }),
  )
