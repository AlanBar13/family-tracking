import { mkdirSync, writeFileSync } from 'node:fs'
import {
  archivoSesion,
  clienteAdmin,
  cookiesDeSesion,
  PASSWORD,
  USUARIOS,
  type Rol,
} from './datos'
import { limpiar } from './global-teardown'

export default async function globalSetup() {
  await limpiar() // restos de una corrida interrumpida
  const admin = clienteAdmin()
  mkdirSync('e2e/.auth', { recursive: true })

  for (const [rol, u] of Object.entries(USUARIOS) as [Rol, (typeof USUARIOS)[Rol]][]) {
    const { error } = await admin.auth.admin.createUser({
      email: u.correo,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw new Error(`createUser ${u.correo}: ${error.message}`)
    if (u.miembro) {
      const r = await admin
        .from('miembros')
        .insert({ correo: u.correo, nombre: u.nombre, es_admin: u.esAdmin })
      if (r.error) throw new Error(`miembros ${u.correo}: ${r.error.message}`)
    }
    const cookies = await cookiesDeSesion(u.correo)
    writeFileSync(archivoSesion(rol), JSON.stringify({ cookies, origins: [] }))
  }
}
