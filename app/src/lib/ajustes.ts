/** Reglas puras de Ajustes (paso 08). Las usan el servidor y las pruebas. */

export type Tipo = 'categorias' | 'tipos_pago'

export const TIPOS = {
  categorias: {
    activo: 'activa',
    fk: 'categoria_id',
    ya: 'Ya existe una categoría con ese nombre.',
    conGastos: 'Esta categoría tiene gastos. Desactívala en lugar de borrarla.',
    sinActivos: 'Debe quedar al menos una categoría activa.',
  },
  tipos_pago: {
    activo: 'activo',
    fk: 'tipo_pago_id',
    ya: 'Ya existe un tipo de pago con ese nombre.',
    conGastos: 'Este tipo de pago tiene gastos. Desactívalo en lugar de borrarlo.',
    sinActivos: 'Debe quedar al menos un tipo de pago activo.',
  },
} as const

export const MSG = {
  soloAdmin: 'Solo un administrador puede cambiar los ajustes.',
  nombreVacio: 'Escribe un nombre.',
  nombreLargo: 'El nombre es demasiado largo (máximo 60 caracteres).',
  correoInvalido: 'El correo no es válido.',
  correoRepetido: 'Ese correo ya es miembro.',
  noExiste: 'Eso ya no existe. Recarga la pantalla.',
  ultimoAdmin: 'Debe quedar al menos un administrador activo.',
  desactivarseASiMismo: 'No puedes desactivarte a ti mismo.',
  borrarseASiMismo: 'No puedes borrarte a ti mismo.',
  miembroConGastos: 'Este miembro tiene gastos. Desactívalo en lugar de borrarlo.',
} as const

const clave = (s: string) => s.trim().toLowerCase()

/** ¿Hay otro elemento con el mismo nombre, sin importar mayúsculas? */
export function nombreDuplicado(
  nombre: string,
  lista: readonly { id: string; nombre: string }[],
  propioId?: string,
): boolean {
  return lista.some((x) => x.id !== propioId && clave(x.nombre) === clave(nombre))
}

/** ¿Quedaría al menos uno activo si `id` pasa a `activo`? (`id` ausente = se borra). */
export function quedaUnoActivo(
  lista: readonly { id: string; activo: boolean }[],
  id: string,
  activo: boolean,
): boolean {
  return lista.some((x) => (x.id === id ? activo : x.activo))
}

type M = { id: string; activo: boolean; esAdmin: boolean }

/**
 * Error que produce un cambio de miembro, o null si se permite.
 * `yoId` es el admin que hace el cambio.
 */
export function errorDeMiembro(
  miembros: readonly M[],
  id: string,
  cambio: { activo?: boolean; esAdmin?: boolean },
  yoId: string,
): string | null {
  const objetivo = miembros.find((m) => m.id === id)
  if (!objetivo) return MSG.noExiste
  if (cambio.activo === false && id === yoId) return MSG.desactivarseASiMismo
  const dejaDeSerAdminActivo =
    objetivo.activo &&
    objetivo.esAdmin &&
    (cambio.activo === false || cambio.esAdmin === false)
  if (dejaDeSerAdminActivo && !miembros.some((m) => m.id !== id && m.activo && m.esAdmin))
    return MSG.ultimoAdmin
  return null
}
