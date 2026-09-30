import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

/**
 * Usuarios de prueba con correo y contraseña. Solo existen mientras corre la
 * suite: el setup los crea con la API admin y el teardown los borra.
 * Requiere que el proveedor de correo esté habilitado en la base de DESARROLLO.
 */
export const PASSWORD = 'e2e-Prueba-12345'
export const USUARIOS = {
  admin: {
    correo: 'e2e-admin@example.com',
    nombre: 'E2E Admin',
    esAdmin: true,
    miembro: true,
  },
  miembro: {
    correo: 'e2e-miembro@example.com',
    nombre: 'E2E Miembro',
    esAdmin: false,
    miembro: true,
  },
  ajeno: {
    correo: 'e2e-ajeno@example.com',
    nombre: 'E2E Ajeno',
    esAdmin: false,
    miembro: false,
  },
} as const
export type Rol = keyof typeof USUARIOS

export const archivoSesion = (rol: Rol) => `e2e/.auth/${rol}.json`

const url = () => process.env.VITE_SUPABASE_URL!
const anon = () => process.env.VITE_SUPABASE_ANON_KEY!

export function clienteAdmin() {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!llave)
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en app/.env (solo para el setup de E2E).',
    )
  return createClient(url(), llave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Inicia sesión por la API y devuelve las cookies tal como las escribe @supabase/ssr. */
export async function cookiesDeSesion(correo: string) {
  const jar = new Map<string, string>()
  const sb = createServerClient(url(), anon(), {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cs) =>
        cs.forEach((c) => (c.value ? jar.set(c.name, c.value) : jar.delete(c.name))),
    },
  })
  const { error } = await sb.auth.signInWithPassword({
    email: correo,
    password: PASSWORD,
  })
  if (error) throw new Error(`No se pudo iniciar sesión como ${correo}: ${error.message}`)
  await new Promise((r) => setTimeout(r, 100)) // setAll puede correr en un microtask posterior
  return [...jar].map(([name, value]) => ({
    name,
    value,
    domain: 'localhost',
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 3600 * 24,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }))
}
