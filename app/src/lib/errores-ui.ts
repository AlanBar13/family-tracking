import { leerErrorApp, type CodigoError } from './errores'
import { MENSAJES } from './mensajes'

export type AccionError = 'reintentar' | 'login' | 'ninguna'

export type ErrorUi = {
  codigo: CodigoError | 'SIN_CONEXION' | 'TIMEOUT'
  titulo: string
  mensaje: string
  accion: AccionError
}

export const MENSAJE_SIN_CONEXION =
  'Sin conexión. Lo que captures no se guardará hasta que vuelva el internet.'

const MENSAJE_TIMEOUT =
  'Tardó demasiado en responder. Revisa tu conexión y, si estabas guardando, confirma en la lista antes de repetir.'

const MENSAJE_SESION = 'Tu sesión expiró. Vuelve a entrar.'

// Lo que lanza `fetch` sin red, según el navegador (Chrome, Firefox, Safari).
const FALLO_DE_RED = /failed to fetch|networkerror|load failed|network request failed/i

function esTimeout(e: unknown) {
  return e instanceof Error && e.name === 'TimeoutError'
}

function esFalloDeRed(e: unknown) {
  return e instanceof TypeError && FALLO_DE_RED.test(e.message)
}

/**
 * De cualquier error a lo que ve la persona. Nunca devuelve texto crudo de
 * Supabase, de `fetch` ni un stack: solo mensajes propios, en español.
 */
export function traducirError(
  e: unknown,
  enLinea = typeof navigator === 'undefined' || navigator.onLine,
): ErrorUi {
  if (esTimeout(e)) {
    return {
      codigo: 'TIMEOUT',
      titulo: 'Tardó demasiado',
      mensaje: MENSAJE_TIMEOUT,
      accion: 'reintentar',
    }
  }
  const { codigo, mensaje } = leerErrorApp(e)
  // Sin red, cualquier falla sin código propio se explica como falta de conexión.
  if (esFalloDeRed(e) || (!enLinea && codigo === 'INTERNO')) {
    return {
      codigo: 'SIN_CONEXION',
      titulo: 'Sin conexión',
      mensaje: MENSAJE_SIN_CONEXION,
      accion: 'reintentar',
    }
  }
  switch (codigo) {
    case 'NO_AUTENTICADO':
      return {
        codigo,
        titulo: 'Sesión expirada',
        mensaje: MENSAJE_SESION,
        accion: 'login',
      }
    case 'NO_AUTORIZADO':
      return { codigo, titulo: 'Sin acceso', mensaje, accion: 'login' }
    case 'VALIDACION':
    case 'NO_ENCONTRADO':
      return { codigo, titulo: 'Revisa los datos', mensaje, accion: 'ninguna' }
    case 'EXTERNO':
      return { codigo, titulo: 'Servicio no disponible', mensaje, accion: 'ninguna' }
    default:
      return {
        codigo: 'INTERNO',
        titulo: 'Ocurrió un problema',
        mensaje: MENSAJES.interno,
        accion: 'reintentar',
      }
  }
}

/** A dónde mandar a la persona si el error es de sesión; `null` si no lo es. */
export function destinoLogin(e: unknown) {
  const { codigo } = leerErrorApp(e)
  if (codigo === 'NO_AUTENTICADO')
    return { to: '/login', search: { error: 'sesion' } } as const
  if (codigo === 'NO_AUTORIZADO')
    return { to: '/login', search: { error: 'no_autorizado' } } as const
  return null
}
