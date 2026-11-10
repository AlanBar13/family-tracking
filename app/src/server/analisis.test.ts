import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Contexto } from './miembro'
import { ErrorApp } from '@/lib/errores'
import { analizarGastosDe, MENSAJES_ANALISIS } from './analisis-logica'

vi.spyOn(console, 'error').mockImplementation(() => {})

const CAT = '11111111-1111-4111-8111-111111111111'
const PAGO = '33333333-1111-4111-8111-111111111111'
const opciones: { llave: string | undefined; modelo: string } = { llave: 'k', modelo: 'gemini-test' }

/** Supabase simulado: solo marzo 2026 tiene gastos; los miembros tienen nombre y correo reconocibles. */
function ctxFalso(conGastos = true) {
  const from = (tabla: string) => {
    let desde = ''
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'order', 'lt']) q[m] = () => q
    q.gte = (_: string, v: string) => ((desde = v), q)
    q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      const data =
        tabla === 'categorias'
          ? [{ id: CAT, nombre: 'Súper', orden: 1, activa: true, presupuesto: null }]
          : tabla === 'tipos_pago'
            ? [{ id: PAGO, nombre: 'Efectivo', orden: 1, activo: true }]
            : tabla === 'miembros'
              ? [{ id: 'm1', nombre: 'Zulema Secreta', correo: 'zulema@secreto.mx' }]
              : tabla === 'gastos' && conGastos && desde.startsWith('2026-03')
                ? [
                    {
                      id: 'g1',
                      nombre: 'Tortillas',
                      monto: 25,
                      fecha: '2026-03-03',
                      categoria_id: CAT,
                      tipo_pago_id: PAGO,
                      autor_id: 'm1',
                      notas: null,
                    },
                  ]
                : []
      return Promise.resolve({ data, error: null }).then(res, rej)
    }
    return q
  }
  return {
    supabase: { from, rpc: async () => ({ data: [], error: null }) },
    usuario: { id: 'u1' },
    miembro: { id: 'm1', nombre: 'Zulema Secreta', correo: 'zulema@secreto.mx', es_admin: false },
  } as unknown as Contexto
}

const respuestaGemini = (texto: unknown, status = 200) =>
  new Response(
    status === 200
      ? JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(texto) }] } }] })
      : 'error',
    { status },
  )

const analizar = (o = opciones, ctx = ctxFalso()) => analizarGastosDe(ctx, '2026-03', 'America/Mexico_City', o)

async function fallo(p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    return e as ErrorApp
  }
  throw new Error('no falló')
}

describe('analizarGastosDe', () => {
  const fetchFalso = vi.fn()
  beforeEach(() => {
    fetchFalso.mockReset()
    vi.stubGlobal('fetch', fetchFalso)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('mes sin gastos: VALIDACION y no llama a Gemini', async () => {
    const e = await fallo(analizar(opciones, ctxFalso(false)))
    expect(e.codigo).toBe('VALIDACION')
    expect(e.message).toBe(MENSAJES_ANALISIS.sinGastos)
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('sin llave: error sin llamar a Gemini', async () => {
    const e = await fallo(analizar({ ...opciones, llave: undefined }))
    expect(e.message).toBe(MENSAJES_ANALISIS.sinLlave)
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  const rec = {
    titulo: 'Ahorra',
    detalle: 'Compra a granel.',
    accion: 'Fijar tope de $500 en súper.',
    ahorroMensual: 200,
    prioridad: 'alta',
  }
  const respuesta = { diagnostico: 'Gastaste poco.', recomendaciones: [rec] }

  it('respuesta válida: devuelve diagnóstico y recomendaciones', async () => {
    fetchFalso.mockResolvedValue(respuestaGemini(respuesta))
    expect(await analizar()).toEqual(respuesta)
  })

  it('prioridad inválida: respuesta ilegible', async () => {
    fetchFalso.mockResolvedValue(
      respuestaGemini({ ...respuesta, recomendaciones: [{ ...rec, prioridad: 'urgente' }] }),
    )
    expect((await fallo(analizar())).message).toBe(MENSAJES_ANALISIS.ilegible)
  })

  it('el body enviado a Gemini no contiene correos ni nombres de miembros', async () => {
    fetchFalso.mockResolvedValue(respuestaGemini(respuesta))
    await analizar()
    const [url, init] = fetchFalso.mock.calls[0]!
    expect(url).toContain('gemini-test')
    expect(init.headers['x-goog-api-key']).toBe('k')
    expect(init.body).toContain('Tortillas')
    expect(init.body).not.toMatch(/zulema|secret|@/i)
  })

  it('429: mensaje de saturado', async () => {
    fetchFalso.mockResolvedValue(respuestaGemini(null, 429))
    expect((await fallo(analizar())).message).toBe(MENSAJES_ANALISIS.saturado)
  })

  it('forma inválida: mensaje de respuesta ilegible', async () => {
    fetchFalso.mockResolvedValue(respuestaGemini({ diagnostico: 'x', recomendaciones: [] }))
    const e = await fallo(analizar())
    expect(e.codigo).toBe('EXTERNO')
    expect(e.message).toBe(MENSAJES_ANALISIS.ilegible)
  })
})
