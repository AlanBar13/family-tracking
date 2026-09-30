/** `fetch` que aborta con `TimeoutError` pasados `ms`; respeta la señal que ya traiga. */
export const fetchConTimeout =
  (ms: number): typeof fetch =>
  (input, init) => {
    const limite = AbortSignal.timeout(ms)
    const signal = init?.signal ? AbortSignal.any([init.signal, limite]) : limite
    return fetch(input, { ...init, signal })
  }

export const TIMEOUT_NORMAL = 20_000
export const TIMEOUT_TICKET = 60_000
