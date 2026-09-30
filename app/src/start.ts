import { createStart } from '@tanstack/react-start'
import { fetchConTimeout, TIMEOUT_NORMAL } from '@/lib/fetch-timeout'

// Todas las server functions del cliente tienen 20 s; el ticket pasa su propio `fetch` (60 s).
export const startInstance = createStart(() => ({
  serverFns: { fetch: fetchConTimeout(TIMEOUT_NORMAL) },
}))
