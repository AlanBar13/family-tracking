import { describe, expect, it } from 'vitest'
import { PALETA } from './paleta'
import {
  acumular,
  agruparPorDia,
  anchoBarra,
  colorCategoria,
  colorPersona,
  etiquetaDia,
  etiquetaMes,
  mesRelativo,
  nombreDeMiembro,
  porcentaje,
} from './resumen'

describe('resumen', () => {
  it('acumular suma en centavos, ordena de mayor a menor y rotula lo vacío', () => {
    const r = acumular(
      [
        { monto: 0.1, k: 'a' },
        { monto: 0.2, k: 'a' },
        { monto: 5, k: '' },
        { monto: 1, k: 'b' },
      ],
      (x) => x.k,
    )
    expect(r).toEqual([
      { clave: 'Sin especificar', total: 5 },
      { clave: 'b', total: 1 },
      { clave: 'a', total: 0.3 },
    ])
  })

  it('porcentaje entero y total cero', () => {
    expect(porcentaje(1, 3)).toBe(33)
    expect(porcentaje(2, 3)).toBe(67)
    expect(porcentaje(5, 0)).toBe(0)
  })

  it('anchoBarra tiene un mínimo de 2', () => {
    expect(anchoBarra(50, 100)).toBe(50)
    expect(anchoBarra(0.1, 100)).toBe(2)
  })

  it('colorCategoria usa el orden (incluidas inactivas) y da la vuelta a la paleta', () => {
    const cats = Array.from({ length: 13 }, (_, i) => ({ id: `c${i}` }))
    expect(colorCategoria('c0', cats)).toBe(PALETA[0])
    expect(colorCategoria('c12', cats)).toBe(PALETA[0])
    expect(colorCategoria('no-existe', cats)).toBe(PALETA[13 % PALETA.length])
  })

  it('colorPersona salta de 4 en 4 desde 1', () => {
    expect([0, 1, 2, 3].map(colorPersona)).toEqual([
      PALETA[1],
      PALETA[5],
      PALETA[9],
      PALETA[1],
    ])
  })

  it('nombreDeMiembro usa el nombre y, si no, el correo antes de la @', () => {
    const ms = [
      { id: '1', nombre: 'Ana' },
      { id: '2', nombre: ' ', correo: 'luis@x.com' },
    ]
    expect(nombreDeMiembro('1', ms)).toBe('Ana')
    expect(nombreDeMiembro('2', ms)).toBe('luis')
    expect(nombreDeMiembro('9', ms)).toBe('Sin especificar')
  })

  it('agruparPorDia conserva el orden', () => {
    const g = [
      { fecha: '2026-09-28', n: 1 },
      { fecha: '2026-09-28', n: 2 },
      { fecha: '2026-09-25', n: 3 },
    ]
    expect(agruparPorDia(g).map((x) => [x.fecha, x.gastos.length])).toEqual([
      ['2026-09-28', 2],
      ['2026-09-25', 1],
    ])
  })

  it('etiquetas de día y mes', () => {
    expect(etiquetaDia('2026-03-02')).toBe('lunes 2 de marzo')
    expect(etiquetaDia('2026-09-30')).toBe('miércoles 30 de septiembre')
    expect(etiquetaMes('2026-03')).toBe('Marzo 2026')
  })

  it('mesRelativo cruza el año', () => {
    expect(mesRelativo('2026-01', -1)).toBe('2025-12')
    expect(mesRelativo('2025-12', 1)).toBe('2026-01')
    expect(mesRelativo('2026-09', 0)).toBe('2026-09')
  })
})
