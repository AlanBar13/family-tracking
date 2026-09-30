import { describe, expect, it } from 'vitest'
import { MENSAJES } from './mensajes'
import { aErrorVisible, gastoEntrada } from './validacion'

const uuid = '11111111-1111-4111-8111-111111111111'
const base = {
  nombre: 'Tortillas',
  monto: 25,
  fecha: '2026-03-03',
  categoriaId: uuid,
  tipoPagoId: uuid,
  notas: '',
}
const mensaje = (o: object) => {
  const r = gastoEntrada.safeParse({ ...base, ...o })
  return r.success ? null : aErrorVisible(r.error)
}

describe('gastoEntrada', () => {
  it('acepta un gasto válido', () => {
    expect(gastoEntrada.safeParse(base).success).toBe(true)
  })
  it('cada mensaje', () => {
    expect(mensaje({ nombre: '   ' })).toBe(MENSAJES.nombreVacio)
    expect(mensaje({ nombre: 'x'.repeat(121) })).toBe(MENSAJES.nombreLargo)
    expect(mensaje({ monto: 0 })).toBe(MENSAJES.montoInvalido)
    expect(mensaje({ monto: -3 })).toBe(MENSAJES.montoInvalido)
    expect(mensaje({ monto: NaN })).toBe(MENSAJES.montoInvalido)
    expect(mensaje({ monto: '12' })).toBe(MENSAJES.montoInvalido)
    expect(mensaje({ fecha: '2026-02-30' })).toBe(MENSAJES.fechaInvalida)
    expect(mensaje({ fecha: '' })).toBe(MENSAJES.fechaInvalida)
    expect(mensaje({ categoriaId: 'nope' })).toBe(MENSAJES.categoriaInvalida)
    expect(mensaje({ tipoPagoId: 'nope' })).toBe(MENSAJES.tipoPagoInvalido)
    expect(mensaje({ notas: 'x'.repeat(501) })).toBe(MENSAJES.notasLargas)
  })
  it('devuelve el primer mensaje cuando hay varios errores', () => {
    expect(mensaje({ nombre: '', monto: 0 })).toBe(MENSAJES.nombreVacio)
  })
  it('redondea el monto a 2 decimales', () => {
    expect(gastoEntrada.parse({ ...base, monto: 10.005 }).monto).toBe(10.01)
    expect(gastoEntrada.parse({ ...base, monto: 10.006 }).monto).toBe(10.01)
    expect(gastoEntrada.parse({ ...base, monto: 1.234 }).monto).toBe(1.23)
  })
  it('0.004 redondea a 0 y se rechaza', () => {
    expect(mensaje({ monto: 0.004 })).toBe(MENSAJES.montoInvalido)
  })
  it('recorta espacios y notas ausentes quedan vacías', () => {
    const r = gastoEntrada.parse({ ...base, nombre: '  Leche  ', notas: undefined })
    expect(r.nombre).toBe('Leche')
    expect(r.notas).toBe('')
    expect(gastoEntrada.parse({ ...base, notas: '  hola ' }).notas).toBe('hola')
  })
})
