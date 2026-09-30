import { crearClienteServidor } from '@/lib/supabase/servidor'
import { resolverMiembro, type Contexto } from './miembro'

/** Punto de entrada para toda server function que necesite un miembro activo. */
export async function requerirMiembro(): Promise<Contexto> {
  return resolverMiembro(crearClienteServidor())
}
