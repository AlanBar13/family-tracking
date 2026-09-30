import { describe, expect, it } from 'vitest'
import { PALETA } from './paleta'

describe('PALETA', () => {
  it('tiene 12 colores hexadecimales únicos', () => {
    expect(PALETA).toHaveLength(12)
    expect(new Set(PALETA).size).toBe(12)
    for (const color of PALETA) expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })
})
