import { MENSAJES } from './mensajes'

export type CodigoError =
  | 'NO_AUTENTICADO'
  | 'NO_AUTORIZADO'
  | 'VALIDACION'
  | 'NO_ENCONTRADO'
  | 'EXTERNO'
  | 'INTERNO'

export class ErrorApp extends Error {
  readonly codigo: CodigoError

  constructor(codigo: CodigoError, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApp'
    this.codigo = codigo
  }
}

export function mensajeNoAutorizado(correo: string): string {
  return `La cuenta ${correo} no tiene acceso. Pide que te agreguen en Ajustes.`
}

/** Nombre a mostrar: el del miembro o, si está vacío, la parte del correo antes de la @. */
export function nombreVisible(miembro: { nombre: string; correo: string }): string {
  const nombre = miembro.nombre.trim()
  return nombre || (miembro.correo.split('@')[0] ?? miembro.correo)
}

/** Cualquier error desconocido pasa a `INTERNO`; el detalle solo va al log del servidor. */
export function aErrorApp(e: unknown): ErrorApp {
  if (e instanceof ErrorApp) return e
  console.error('Error inesperado', e)
  return new ErrorApp('INTERNO', MENSAJES.interno)
}

const FORMATO = /^\[([A-Z_]+)\] ([\s\S]*)$/

/**
 * TanStack serializa los errores de server functions con un plugin que solo
 * conserva `message` (se pierden la clase y `codigo`). Por eso el código viaja
 * dentro del mensaje: `[CODIGO] texto`. Se lanza con `paraCliente` y se lee con
 * `leerErrorApp`.
 */
export function paraCliente(e: ErrorApp): Error {
  return new Error(`[${e.codigo}] ${e.message}`)
}

export function leerErrorApp(e: unknown): { codigo: CodigoError; mensaje: string } {
  if (e instanceof ErrorApp) return { codigo: e.codigo, mensaje: e.message }
  const m = e instanceof Error ? FORMATO.exec(e.message) : null
  if (m) return { codigo: m[1] as CodigoError, mensaje: m[2]! }
  return { codigo: 'INTERNO', mensaje: MENSAJES.interno }
}
