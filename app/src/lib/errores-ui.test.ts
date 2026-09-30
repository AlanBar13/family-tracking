import { describe, expect, it } from 'vitest'
import { paraCliente, ErrorApp } from './errores'
import { destinoLogin, MENSAJE_SIN_CONEXION, traducirError } from './errores-ui'

const servidor = (codigo: ConstructorParameters<typeof ErrorApp>[0], m: string) =>
  paraCliente(new ErrorApp(codigo, m))

describe('traducirError', () => {
  it('sin conexión: evento offline o falla de red de fetch', () => {
    const a = traducirError(new Error('cualquier cosa'), false)
    expect(a).toMatchObject({ codigo: 'SIN_CONEXION', mensaje: MENSAJE_SIN_CONEXION })
    const b = traducirError(new TypeError('Failed to fetch'), true)
    expect(b.codigo).toBe('SIN_CONEXION')
    expect(
      traducirError(new TypeError('NetworkError when attempting to fetch resource.'))
        .codigo,
    ).toBe('SIN_CONEXION')
    expect(traducirError(new TypeError('Load failed')).codigo).toBe('SIN_CONEXION')
  })

  it('sesión expirada', () => {
    expect(traducirError(servidor('NO_AUTENTICADO', 'x'), true)).toMatchObject({
      codigo: 'NO_AUTENTICADO',
      mensaje: 'Tu sesión expiró. Vuelve a entrar.',
      accion: 'login',
    })
  })

  it('ya no es miembro: conserva el mensaje del servidor', () => {
    const r = traducirError(
      servidor('NO_AUTORIZADO', 'La cuenta a@b.c no tiene acceso.'),
      true,
    )
    expect(r).toMatchObject({
      codigo: 'NO_AUTORIZADO',
      mensaje: 'La cuenta a@b.c no tiene acceso.',
      accion: 'login',
    })
  })

  it('validación y externo: mensaje del servidor, sin acción', () => {
    expect(
      traducirError(servidor('VALIDACION', 'Ponle un nombre al gasto.'), true),
    ).toMatchObject({
      mensaje: 'Ponle un nombre al gasto.',
      accion: 'ninguna',
    })
    expect(
      traducirError(servidor('EXTERNO', 'Gemini está saturado.'), true),
    ).toMatchObject({
      codigo: 'EXTERNO',
      mensaje: 'Gemini está saturado.',
      accion: 'ninguna',
    })
  })

  it('inesperado, 5xx o respuesta no válida: genérico con reintentar', () => {
    for (const e of [
      servidor('INTERNO', 'detalle'),
      new Error('Internal Server Error'),
      'texto',
      undefined,
    ]) {
      expect(traducirError(e, true)).toMatchObject({
        codigo: 'INTERNO',
        mensaje: 'Algo salió mal. Intenta de nuevo.',
        accion: 'reintentar',
      })
    }
  })

  it('timeout', () => {
    const e = new DOMException('signal timed out', 'TimeoutError')
    expect(traducirError(e, true)).toMatchObject({
      codigo: 'TIMEOUT',
      accion: 'reintentar',
    })
    expect(traducirError(e, true).mensaje).toMatch(/^Tardó demasiado en responder/)
  })

  it('nunca expone texto crudo', () => {
    const r = traducirError(
      new Error('duplicate key value violates unique constraint "x"'),
      true,
    )
    expect(r.mensaje).not.toMatch(/duplicate|constraint/)
  })
})

describe('destinoLogin', () => {
  it('solo para errores de sesión', () => {
    expect(destinoLogin(servidor('NO_AUTENTICADO', 'x'))?.search.error).toBe('sesion')
    expect(destinoLogin(servidor('NO_AUTORIZADO', 'x'))?.search.error).toBe(
      'no_autorizado',
    )
    expect(destinoLogin(servidor('VALIDACION', 'x'))).toBeNull()
  })
})
