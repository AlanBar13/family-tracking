import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { ErrorApp, mensajeNoAutorizado } from '@/lib/errores'

export type Miembro = Database['public']['Tables']['miembros']['Row']

export type Contexto = {
  supabase: SupabaseClient<Database>
  usuario: User
  miembro: Miembro
}

/**
 * Lógica de `requerirMiembro()` con el cliente inyectado (testeable).
 * Valida el JWT con `auth.getUser()`; nunca confía en `getSession()`.
 */
export async function resolverMiembro(
  supabase: SupabaseClient<Database>,
): Promise<Contexto> {
  const { data, error } = await supabase.auth.getUser()
  const usuario = data.user
  if (error || !usuario) {
    throw new ErrorApp('NO_AUTENTICADO', 'Inicia sesión para continuar.')
  }

  const correo = (usuario.email ?? '').toLowerCase()

  const vinculo = await supabase.rpc('vincular_miembro')
  if (vinculo.error) {
    console.error('vincular_miembro falló', vinculo.error)
    throw new ErrorApp('INTERNO', 'Algo salió mal. Intenta de nuevo.')
  }

  const { data: miembro, error: errorMiembro } = await supabase
    .from('miembros')
    .select('*')
    .eq('correo', correo)
    .eq('activo', true)
    .maybeSingle()
  if (errorMiembro) {
    console.error('consulta de miembro falló', errorMiembro)
    throw new ErrorApp('INTERNO', 'Algo salió mal. Intenta de nuevo.')
  }
  if (!miembro) throw new ErrorApp('NO_AUTORIZADO', mensajeNoAutorizado(correo))

  return { supabase, usuario, miembro }
}
