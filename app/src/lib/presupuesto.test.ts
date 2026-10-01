import { describe, expect, it } from 'vitest'
import { mensajeAviso, umbralCruzado } from './presupuesto'

describe('umbralCruzado', () => {
  it('no avisa por debajo del 80%', () =>
    expect(umbralCruzado(10, 79.99, 100)).toBeNull())
  it('avisa al cruzar el 80%', () => expect(umbralCruzado(70, 80, 100)).toBe(80))
  it('cruzar 80 y 100 de golpe avisa 100', () =>
    expect(umbralCruzado(10, 150, 100)).toBe(100))
  it('ya estaba arriba del 80%: no repite', () =>
    expect(umbralCruzado(85, 90, 100)).toBeNull())
  it('avisa al pasar el 100%', () => expect(umbralCruzado(90, 100, 100)).toBe(100))
  it('bajar no avisa', () => expect(umbralCruzado(120, 50, 100)).toBeNull())
})

describe('mensajeAviso', () => {
  it('80%', () =>
    expect(mensajeAviso('Súper', 4100, 5000, 80).title).toBe(
      'Súper: 82% del presupuesto',
    ))
  it('100%', () =>
    expect(mensajeAviso('Súper', 5100, 5000, 100).title).toContain('te pasaste'))
})
