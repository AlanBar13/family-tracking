import type { Page } from '@playwright/test'

/**
 * Respuesta de una server function tal como la serializa TanStack (seroval):
 * `{ result, error, context }`. Constantes: 0 null, 1 undefined, 2 true, 3 false.
 */
export function respuestaServerFn(resultado: Record<string, string | number>) {
  let i = 0
  const nodo = (v: unknown): unknown => {
    if (v === undefined) return { t: 2, s: 1 }
    if (typeof v === 'string') return { t: 1, s: v }
    if (typeof v === 'number') return { t: 0, s: v }
    const propios = Object.entries(v as Record<string, unknown>)
    const id = i++
    return {
      t: 10,
      i: id,
      p: { k: propios.map(([k]) => k), v: propios.map(([, x]) => nodo(x)) },
      o: 0,
    }
  }
  return {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-tss-serialized': 'true' },
    body: JSON.stringify(nodo({ result: resultado, error: undefined, context: {} })),
  }
}

/** PNG de 1×1 para el input de foto (la compresión del cliente solo necesita una imagen válida). */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

export const nombreUnico = (base: string) => `E2E ${base} ${Date.now().toString(36)}`

/** Llena lo mínimo del formulario de gasto (ya abierto). */
export async function llenarGasto(page: Page, nombre: string, monto: string) {
  await page.getByLabel('Monto').fill(monto)
  await page.getByLabel('Nombre del gasto').fill(nombre)
}
