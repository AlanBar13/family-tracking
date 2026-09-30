import { describe, expect, it } from 'vitest'
import { MSG, errorDeMiembro, nombreDuplicado, quedaUnoActivo } from './ajustes'

describe('nombreDuplicado', () => {
  const lista = [{ id: '1', nombre: 'Despensa' }]
  it('ignora mayúsculas y espacios', () => {
    expect(nombreDuplicado('  despensa ', lista)).toBe(true)
  })
  it('permite conservar el nombre propio al renombrar', () => {
    expect(nombreDuplicado('DESPENSA', lista, '1')).toBe(false)
  })
  it('permite nombres nuevos', () => {
    expect(nombreDuplicado('Casa', lista)).toBe(false)
  })
})

describe('quedaUnoActivo', () => {
  const lista = [
    { id: '1', activo: true },
    { id: '2', activo: false },
  ]
  it('no deja el hogar sin activos', () => {
    expect(quedaUnoActivo(lista, '1', false)).toBe(false)
  })
  it('permite si queda otro activo', () => {
    expect(quedaUnoActivo(lista, '2', false)).toBe(true)
    expect(quedaUnoActivo([...lista, { id: '3', activo: true }], '1', false)).toBe(true)
  })
})

describe('errorDeMiembro', () => {
  const a = { id: 'a', activo: true, esAdmin: true }
  const b = { id: 'b', activo: true, esAdmin: false }
  const c = { id: 'c', activo: true, esAdmin: true }
  it('protege al último admin activo', () => {
    expect(errorDeMiembro([a, b], 'a', { esAdmin: false }, 'c')).toBe(MSG.ultimoAdmin)
    expect(errorDeMiembro([a, b], 'a', { activo: false }, 'c')).toBe(MSG.ultimoAdmin)
  })
  it('un admin inactivo no cuenta como respaldo', () => {
    expect(errorDeMiembro([a, { ...c, activo: false }], 'a', { esAdmin: false }, 'a')).toBe(
      MSG.ultimoAdmin,
    )
  })
  it('permite quitar el admin si hay otro activo', () => {
    expect(errorDeMiembro([a, c], 'a', { esAdmin: false }, 'a')).toBeNull()
  })
  it('un admin no puede desactivarse a sí mismo', () => {
    expect(errorDeMiembro([a, c], 'a', { activo: false }, 'a')).toBe(MSG.desactivarseASiMismo)
  })
  it('permite desactivar a un miembro normal', () => {
    expect(errorDeMiembro([a, b], 'b', { activo: false }, 'a')).toBeNull()
  })
  it('id inexistente', () => {
    expect(errorDeMiembro([a], 'x', { activo: false }, 'a')).toBe(MSG.noExiste)
  })
})
