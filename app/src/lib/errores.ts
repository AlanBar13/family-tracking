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
