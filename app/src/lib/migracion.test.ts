import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { describe, expect, it } from 'vitest'
import {
  leerConfig,
  leerGastos,
  parsearFecha,
  parsearMonto,
  planearCatalogo,
  planearMiembros,
  totalesPorMes,
  type FilaCsv,
} from './migracion'

const csv = (nombre: string) =>
  parse(readFileSync(new URL(`../../scripts/__fixtures__/${nombre}`, import.meta.url)), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as FilaCsv[]

describe('parsearMonto', () => {
  it.each([
    ['$1,234.50', 1234.5],
    [' 850 ', 850],
    ['$ 600.005', 600.01],
    ['0', 0],
    ['499,62', 499.62],
    ['1.234,5', 1234.5],
    ['1,234', 1234],
  ])('%s → %s', (texto, esperado) => expect(parsearMonto(texto)).toBe(esperado))
  it.each(['', 'abc', '1.2.3', '12,5x'])('%j no es número', (t) => expect(parsearMonto(t)).toBeNull())
})

describe('parsearFecha', () => {
  it.each([
    ['2026-03-02', '2026-03-02'],
    ['2026/3/2', '2026-03-02'],
    ['05/03/2026', '2026-03-05'],
    ['2026-03-02T00:00:00.000Z', '2026-03-02'],
  ])('%s → %s', (t, e) => expect(parsearFecha(t)).toBe(e))
  it.each(['', 'ayer', '2026-02-30', '31/04/2026'])('%j es ilegible', (t) => expect(parsearFecha(t)).toBeNull())
})

describe('fixtures', () => {
  const { gastos, omitidas, sinId } = leerGastos(csv('Gastos.csv'))
  const cfg = leerConfig(csv('Config.csv'))

  it('Config: listas independientes, correo en minúsculas, nombre por omisión', () => {
    expect(cfg.categorias).toEqual(['Despensa', 'Casa', 'Servicios'])
    expect(cfg.tiposPago).toEqual(['Transferencia', 'Crédito', 'Efectivo'])
    expect(cfg.personas).toEqual([
      { correo: 'ana@ejemplo.com', nombre: 'Ana' },
      { correo: 'beto@ejemplo.com', nombre: 'beto' },
    ])
  })

  it('Gastos: válidos, ignorados sin ID y omitidas con su fila', () => {
    expect(gastos.map((g) => g.nombre)).toEqual(['Súper', 'Luz', 'Gasolina', 'Tarjeta vieja'])
    expect(gastos[0]).toMatchObject({ monto: 1234.5, notas: 'Semana, con ofertas' })
    expect(gastos[1]!.fecha).toBe('2026-03-05')
    expect(gastos[2]!.notas).toBe('Nota con\nsalto de línea')
    expect(sinId).toBe(1)
    expect(omitidas).toEqual([
      { fila: 6, motivo: 'Nombre vacío.' },
      { fila: 7, motivo: 'Monto inválido: "0".' },
      { fila: 8, motivo: 'Fecha ilegible: "2026-02-30".' },
    ])
  })

  it('catálogos: Config activo, el resto inactivo, sin duplicar por mayúsculas', () => {
    expect(planearCatalogo(cfg.categorias, gastos.map((g) => g.categoria))).toEqual([
      { nombre: 'Despensa', activo: true },
      { nombre: 'Casa', activo: true },
      { nombre: 'Servicios', activo: true },
      { nombre: 'Transporte', activo: false },
    ])
  })

  it('miembros: autor desconocido queda inactivo', () => {
    const m = planearMiembros(cfg.personas, gastos.map((g) => g.autor))
    expect(m.map((x) => [x.correo, x.activo])).toEqual([
      ['ana@ejemplo.com', true],
      ['beto@ejemplo.com', true],
      ['carlos@ejemplo.com', false],
    ])
  })

  it('totales por mes en centavos', () => {
    expect([...totalesPorMes(gastos)]).toEqual([
      ['2026-03', 123450 + 85000 + 20000],
      ['2026-04', 60001],
    ])
  })
})
