import { describe, expect, it } from 'vitest'
import {
  fechaPorOmision,
  hoyEnZona,
  listaDeMeses,
  mesActual,
  normalizarMes,
  rangoDelMes,
  esFechaValida,
} from './fechas'

const MX = 'America/Mexico_City'

describe('fechas', () => {
  it('23:30 en México ya es el día siguiente en UTC, pero hoy sigue siendo el de México', () => {
    const ahora = new Date('2026-03-04T05:30:00Z') // 23:30 del 3 de marzo en CDMX (UTC-6)
    expect(ahora.toISOString().slice(0, 10)).toBe('2026-03-04')
    expect(hoyEnZona(MX, ahora)).toBe('2026-03-03')
  })

  it('cambio de año: 31 dic 23:30 en México sigue en el año viejo', () => {
    const ahora = new Date('2027-01-01T05:30:00Z')
    expect(hoyEnZona(MX, ahora)).toBe('2026-12-31')
    expect(mesActual(MX, ahora)).toBe('2026-12')
  })

  it('normalizarMes valida y cae al mes actual', () => {
    const ahora = new Date('2026-09-30T18:00:00Z')
    expect(normalizarMes('2026-02', MX, ahora)).toBe('2026-02')
    for (const malo of ['', '2026-13', '2026-00', '26-01', 'x', undefined, 5])
      expect(normalizarMes(malo, MX, ahora)).toBe('2026-09')
  })

  it('rangoDelMes, incluido diciembre', () => {
    expect(rangoDelMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-03-01' })
    expect(rangoDelMes('2026-12')).toEqual({ desde: '2026-12-01', hasta: '2027-01-01' })
  })

  it('listaDeMeses: sin duplicados, descendente, incluye el actual', () => {
    expect(listaDeMeses(['2026-01', '2026-03', '2026-01'], '2026-09')).toEqual([
      '2026-09',
      '2026-03',
      '2026-01',
    ])
    expect(listaDeMeses(['2026-09'], '2026-09')).toEqual(['2026-09'])
  })

  it('fechaPorOmision', () => {
    expect(fechaPorOmision('2026-09', '2026-09-30')).toBe('2026-09-30')
    expect(fechaPorOmision('2026-03', '2026-09-30')).toBe('2026-03-01')
  })

  it('esFechaValida rechaza días inexistentes', () => {
    expect(esFechaValida('2026-02-28')).toBe(true)
    expect(esFechaValida('2028-02-29')).toBe(true)
    expect(esFechaValida('2026-02-30')).toBe(false)
    expect(esFechaValida('2026-2-3')).toBe(false)
  })
})
