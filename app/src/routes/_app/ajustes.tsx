import { createFileRoute, redirect } from '@tanstack/react-router'
import { AjustesPantalla } from '@/components/Ajustes'
import { destinoLogin } from '@/lib/errores-ui'
import { obtenerAjustes } from '@/server/ajustes'

export const Route = createFileRoute('/_app/ajustes')({
  loader: async () => {
    try {
      return await obtenerAjustes()
    } catch (e) {
      // Miembro desactivado o sesión vencida: de vuelta al login.
      const login = destinoLogin(e)
      if (login) throw redirect(login)
      throw e
    }
  },
  component: Ajustes,
})

function Ajustes() {
  return <AjustesPantalla inicial={Route.useLoaderData()} />
}
