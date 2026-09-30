import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { leerTicketDe, MENSAJES_TICKET } from './ticket-logica'

const o = {
  llave: 'k',
  modelo: 'm',
  hoy: '2026-09-30',
  categorias: [{ id: 'c1', nombre: 'Despensa' }],
  tiposPago: [{ id: 't1', nombre: 'Efectivo' }],
}
const respuesta = (status: number, cuerpo: unknown) =>
  new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), { status })
const gemini = (texto: string) => ({ candidates: [{ content: { parts: [{ text: texto }] } }] })

beforeEach(() => void vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => void vi.restoreAllMocks())

describe('leerTicketDe', () => {
  it('200: devuelve la propuesta y manda la llave en el header', async () => {
    const f = vi.fn().mockResolvedValue(
      respuesta(200, gemini(JSON.stringify({ comercio: 'Oxxo', total: 50, fecha: '2026-09-29', categoria: 'Despensa', tipoPago: 'Efectivo', confianza: 'alta' }))),
    )
    vi.stubGlobal('fetch', f)
    await expect(leerTicketDe('abc', o)).resolves.toMatchObject({ nombre: 'Oxxo', monto: 50, categoriaId: 'c1', tipoPagoId: 't1' })
    expect(f.mock.calls[0]![1].headers['x-goog-api-key']).toBe('k')
  })
  it('429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(429, { error: { message: 'quota' } })))
    await expect(leerTicketDe('abc', o)).rejects.toThrow(MENSAJES_TICKET.saturado)
  })
  it('400 con API key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(400, { error: { message: 'API key not valid' } })))
    await expect(leerTicketDe('abc', o)).rejects.toThrow(MENSAJES_TICKET.llave)
  })
  it('500: genérico, sin detalle técnico', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(500, { error: { message: 'boom interno' } })))
    await expect(leerTicketDe('abc', o)).rejects.toThrow(MENSAJES_TICKET.generico)
  })
  it('JSON roto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, gemini('{no es json'))))
    await expect(leerTicketDe('abc', o)).rejects.toThrow(MENSAJES_TICKET.ilegible)
  })
  it('sin llave y foto enorme no llaman a Gemini', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    await expect(leerTicketDe('abc', { ...o, llave: undefined })).rejects.toThrow(MENSAJES_TICKET.sinLlave)
    await expect(leerTicketDe('a'.repeat(5_600_000), o)).rejects.toThrow(MENSAJES_TICKET.pesa)
    expect(f).not.toHaveBeenCalled()
  })
})
