import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { MSG } from '@/lib/ajustes'
import { aErrorApp, ErrorApp, paraCliente } from '@/lib/errores'
import { aErrorVisible } from '@/lib/validacion'
import {
  activarElementoDe,
  actualizarMiembroDe,
  agregarMiembroDe,
  borrarElementoDe,
  borrarMiembroDe,
  crearElementoDe,
  fijarPresupuestoDe,
  obtenerAjustesDe,
  reordenarElementosDe,
  renombrarElementoDe,
} from './ajustes-logica'
import { requerirMiembro } from './requerir-miembro'

// Mismo patrón que gastos.ts: el validator solo tipa, Zod corre dentro de `ejecutar`.
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

async function ejecutar<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f()
  } catch (e) {
    throw paraCliente(aErrorApp(e))
  }
}

const tipo = z.enum(['categorias', 'tipos_pago'])
const id = z.uuid(MSG.noExiste)
const nombre = z.string().trim().min(1, MSG.nombreVacio).max(60, MSG.nombreLargo)
const correo = z.string().trim().toLowerCase().pipe(z.email(MSG.correoInvalido))

const eCrear = entrada(z.object({ tipo, nombre }))
const eRenombrar = entrada(z.object({ tipo, id, nombre }))
const eReordenar = entrada(z.object({ tipo, ids: z.array(id) }))
const eActivar = entrada(z.object({ tipo, id, activo: z.boolean() }))
const eBorrar = entrada(z.object({ tipo, id }))
const eBorrar2 = entrada(z.object({ id }))
const ePresupuesto = entrada(
  z.object({
    id,
    presupuesto: z
      .number(MSG.presupuestoInvalido)
      .positive(MSG.presupuestoInvalido)
      .max(9_999_999_999, MSG.presupuestoInvalido)
      .nullable(),
  }),
)
const eAgregarMiembro = entrada(z.object({ correo, nombre }))
const eActualizarMiembro = entrada(
  z.object({
    id,
    nombre: nombre.optional(),
    activo: z.boolean().optional(),
    esAdmin: z.boolean().optional(),
  }),
)

export const obtenerAjustes = createServerFn({ method: 'GET' }).handler(() =>
  ejecutar(async () => obtenerAjustesDe(await requerirMiembro())),
)

export const crearElemento = createServerFn({ method: 'POST' })
  .validator(eCrear.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eCrear.validar(data)
      return crearElementoDe(await requerirMiembro(), d.tipo, d.nombre)
    }),
  )

export const renombrarElemento = createServerFn({ method: 'POST' })
  .validator(eRenombrar.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eRenombrar.validar(data)
      return renombrarElementoDe(await requerirMiembro(), d.tipo, d.id, d.nombre)
    }),
  )

export const reordenarElementos = createServerFn({ method: 'POST' })
  .validator(eReordenar.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eReordenar.validar(data)
      return reordenarElementosDe(await requerirMiembro(), d.tipo, d.ids)
    }),
  )

export const activarElemento = createServerFn({ method: 'POST' })
  .validator(eActivar.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eActivar.validar(data)
      return activarElementoDe(await requerirMiembro(), d.tipo, d.id, d.activo)
    }),
  )

export const borrarElemento = createServerFn({ method: 'POST' })
  .validator(eBorrar.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eBorrar.validar(data)
      return borrarElementoDe(await requerirMiembro(), d.tipo, d.id)
    }),
  )

export const fijarPresupuesto = createServerFn({ method: 'POST' })
  .validator(ePresupuesto.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = ePresupuesto.validar(data)
      return fijarPresupuestoDe(await requerirMiembro(), d.id, d.presupuesto)
    }),
  )

export const agregarMiembro = createServerFn({ method: 'POST' })
  .validator(eAgregarMiembro.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eAgregarMiembro.validar(data)
      return agregarMiembroDe(await requerirMiembro(), d.correo, d.nombre)
    }),
  )

export const actualizarMiembro = createServerFn({ method: 'POST' })
  .validator(eActualizarMiembro.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eActualizarMiembro.validar(data)
      const { id: miembroId, ...cambio } = d
      return actualizarMiembroDe(await requerirMiembro(), miembroId, cambio)
    }),
  )

export const borrarMiembro = createServerFn({ method: 'POST' })
  .validator(eBorrar2.tipar)
  .handler(({ data }) =>
    ejecutar(async () => {
      const d = eBorrar2.validar(data)
      return borrarMiembroDe(await requerirMiembro(), d.id)
    }),
  )
