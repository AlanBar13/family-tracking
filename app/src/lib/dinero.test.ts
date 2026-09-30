import { describe, expect, it } from 'vitest'
import { dinero, dineroCorto } from './dinero'

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
