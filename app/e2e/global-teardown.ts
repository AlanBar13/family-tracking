import { clienteAdmin, USUARIOS } from './datos'

/** Borra todo lo que la suite crea: gastos de los usuarios de prueba, sus miembros y sus cuentas. */
export async function limpiar() {
  const admin = clienteAdmin()
  const correos: string[] = Object.values(USUARIOS).map((u) => u.correo)

  const { data: miembros } = await admin
    .from('miembros')
    .select('id')
    .in('correo', correos)
  const ids = (miembros ?? []).map((m) => m.id)
  if (ids.length) {
    await admin.from('gastos').delete().in('autor_id', ids)
    await admin.from('miembros').delete().in('id', ids)
  }

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email && correos.includes(u.email)) await admin.auth.admin.deleteUser(u.id)
  }
}

export default limpiar
