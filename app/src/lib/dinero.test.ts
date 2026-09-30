import { describe, expect, it } from 'vitest'
import { aCentavos, dinero, dineroCorto, sumar } from './dinero'

describe('dinero', () => {
  it('usa 2 decimales en MXN', () => {
    expect(dinero(1234.5)).toBe('$1,234.50')
    expect(dinero(0)).toBe('$0.00')
  })
})

describe('dineroCorto', () => {
  it('no usa decimales y redondea', () => {
    expect(dineroCorto(1234.5)).toBe('$1,235')
    expect(dineroCorto(99.4)).toBe('$99')
  })
})

describe('sumar (en centavos)', () => {
  it('10.50 + 5.50 = 1050 + 550 = 1600 = 16.00', () => {
    expect(aCentavos(10.5)).toBe(1050)
    expect(sumar([10.5, 5.5])).toBe(16)
    expect(dinero(sumar([10.5, 5.5]))).toBe('$16.00')
  })
  it('no arrastra error de coma flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(sumar([0.1, 0.2])).toBe(0.3)
    expect(sumar([])).toBe(0)
  })
})
