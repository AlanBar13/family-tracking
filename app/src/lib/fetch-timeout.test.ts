import { afterEach, expect, it, vi } from 'vitest'
import { fetchConTimeout } from './fetch-timeout'
import { traducirError } from './errores-ui'

afterEach(() => vi.unstubAllGlobals())

it('aborta con TimeoutError y se traduce a "Tardó demasiado"', async () => {
  vi.stubGlobal(
    'fetch',
    (_: unknown, init: RequestInit) =>
      new Promise((_, rechazar) =>
        init.signal!.addEventListener('abort', () => rechazar(init.signal!.reason)),
      ),
  )
  const error = await fetchConTimeout(10)('/x').catch((e: unknown) => e)
  expect(error).toMatchObject({ name: 'TimeoutError' })
  expect(traducirError(error, true).codigo).toBe('TIMEOUT')
})

it('respeta la señal del llamador', async () => {
  vi.stubGlobal('fetch', (_: unknown, init: RequestInit) => Promise.resolve(init.signal))
  const propia = new AbortController()
  const senal = (await fetchConTimeout(1000)('/x', {
    signal: propia.signal,
  })) as unknown as AbortSignal
  propia.abort()
  expect(senal.aborted).toBe(true)
})
