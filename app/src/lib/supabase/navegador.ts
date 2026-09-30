import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

function crearCliente() {
  return createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

let cliente: ReturnType<typeof crearCliente> | undefined

export function clienteNavegador() {
  cliente ??= crearCliente()
  return cliente
}
