import { createServerClient } from '@supabase/ssr'
import { deleteCookie, getCookies, setCookie } from '@tanstack/react-start/server'
import type { Database } from '@/lib/database.types'

/** Un cliente por petición: lee y escribe la sesión en las cookies de la petición. */
export function crearClienteServidor() {
  return createServerClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({ name, value }))
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            if (value === '') deleteCookie(name, options)
            else setCookie(name, value, options)
          }
        },
      },
    },
  )
}
