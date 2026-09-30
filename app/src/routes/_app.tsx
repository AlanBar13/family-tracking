import { useEffect } from 'react'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Shell } from '@/components/Shell'
import { traducirError } from '@/lib/errores-ui'
import { miembroValidado } from '@/lib/miembro-validado'
import { obtenerSesion, type Sesion } from '@/server/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    let sesion: Sesion
    try {
      sesion = await obtenerSesion()
    } catch (e) {
      const { codigo } = traducirError(e)
      if (miembroValidado.actual && (codigo === 'SIN_CONEXION' || codigo === 'TIMEOUT')) {
        return { miembro: miembroValidado.actual }
      }
      throw e
    }
    if (sesion.estado === 'anonimo') throw redirect({ to: '/login' })
    if (sesion.estado === 'no_miembro') {
      throw redirect({
        to: '/login',
        search: { error: 'no_autorizado', correo: sesion.correo },
      })
    }
    return { miembro: sesion.miembro }
  },
  component: LayoutProtegido,
})

function LayoutProtegido() {
  const { miembro } = Route.useRouteContext()
  useEffect(() => {
    miembroValidado.actual = miembro
  }, [miembro])
  return (
    <Shell nombre={miembro.nombre}>
      <Outlet />
    </Shell>
  )
}
