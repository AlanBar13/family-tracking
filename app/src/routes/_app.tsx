import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Shell } from '@/components/Shell'
import { obtenerSesion } from '@/server/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const sesion = await obtenerSesion()
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
  return (
    <Shell nombre={miembro.nombre}>
      <Outlet />
    </Shell>
  )
}
