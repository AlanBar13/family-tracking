import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { empatar, instruccionTicket, interpretarRespuesta } from './ticket'

const config = {
  categorias: [
    { id: 'c1', nombre: 'Despensa' },
    { id: 'c2', nombre: 'Comida fuera' },
  ],
  tiposPago: [
    { id: 't1', nombre: 'Transferencia' },
    { id: 't2', nombre: 'Efectivo' },
  ],
}
const hoy = '2026-09-30'
const base = {
  comercio: 'Walmart',
  total: 123.456,
  fecha: '2026-09-28',
  categoria: 'despensa',
  tipoPago: 'EFECTIVO',
  confianza: 'alta',
  nota: '',
}

describe('empatar', () => {
  const l = ['Comida fuera', 'Crédito', 'Otros']
  it('ignora acentos y mayúsculas', () => expect(empatar('CREDITO', l, 'x')).toBe('Crédito'))
  it('exacto gana a "contiene"', () =>
    expect(empatar('otros', ['Otros gastos', 'Otros'], 'x')).toBe('Otros'))
  it('contiene', () => expect(empatar('comida', l, 'x')).toBe('Comida fuera'))
  it('respaldo', () => {
    expect(empatar('zzz', l, 'x')).toBe('x')
    expect(empatar('', l, 'x')).toBe('x')
  })
})

describe('interpretarRespuesta', () => {
  it('caso feliz', () =>
    expect(interpretarRespuesta(base, config, hoy)).toEqual({
      nombre: 'Walmart',
      monto: 123.46,
      fecha: '2026-09-28',
      categoriaId: 'c1',
      tipoPagoId: 't2',
      aviso: 'Revisa los datos antes de guardar',
    }))
  it('sin total', () =>
    expect(interpretarRespuesta({ ...base, total: 0 }, config, hoy).aviso).toBe(
      'No pude leer el total. Escríbelo a mano.',
    ))
  it('confianza baja', () =>
    expect(interpretarRespuesta({ ...base, confianza: 'Baja' }, config, hoy).aviso).toBe(
      'La foto se lee mal, revisa bien los datos.',
    ))
  it('nota del modelo', () =>
    expect(interpretarRespuesta({ ...base, nota: 'Hay propina' }, config, hoy).aviso).toBe(
      'Hay propina',
    ))
  it('fecha inválida → hoy; sin match → primer elemento', () => {
    const r = interpretarRespuesta({ ...base, fecha: '28/09', categoria: '?', tipoPago: '?' }, config, hoy)
    expect(r).toMatchObject({ fecha: hoy, categoriaId: 'c1', tipoPagoId: 't1' })
  })
  it('nombre a 60 caracteres', () =>
    expect(interpretarRespuesta({ ...base, comercio: 'x'.repeat(90) }, config, hoy).nombre).toHaveLength(60))
})

describe('instruccionTicket', () => {
  it('es idéntica a instruccion_() de Ticket.gs', () => {
    const gs = readFileSync(new URL('../../../Ticket.gs', import.meta.url), 'utf8')
    const cuerpo = /function instruccion_\(config\) \{([\s\S]*?)\n\}\n/.exec(gs)![1]!
    const esperado = new Function(
      'config',
      'Utilities',
      'zona_',
      cuerpo,
    )(
      { categorias: ['Despensa', 'Casa'], tiposPago: ['Transferencia', 'Efectivo'] },
      { formatDate: () => hoy },
      () => 'x',
    )
    expect(
      instruccionTicket({ hoy, categorias: ['Despensa', 'Casa'], tiposPago: ['Transferencia', 'Efectivo'] }),
    ).toBe(esperado)
  })
})
