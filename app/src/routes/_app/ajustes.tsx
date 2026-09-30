import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { AjustesPantalla } from '@/components/Ajustes'
import { leerErrorApp } from '@/lib/errores'
import { obtenerAjustes } from '@/server/ajustes'

export const Route = createFileRoute('/_app/ajustes')({
  loader: async () => {
    try {
      return await obtenerAjustes()
    } catch (e) {
      // Miembro desactivado o sesión vencida: de vuelta al login.
      if (['NO_AUTENTICADO', 'NO_AUTORIZADO'].includes(leerErrorApp(e).codigo))
        throw redirect({ to: '/login' })
      throw e
    }
  },
  component: Ajustes,
  errorComponent: ErrorAjustes,
})

function Ajustes() {
  return <AjustesPantalla inicial={Route.useLoaderData()} />
}

function ErrorAjustes({ error }: Readonly<{ error: unknown }>) {
  const router = useRouter()
  return (
    <section role="alert" className="rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta">
      <p className="text-peligro">{leerErrorApp(error).mensaje}</p>
      <button type="button" onClick={() => router.invalidate()} className="mt-3 font-medium text-acento">
        Reintentar
      </button>
    </section>
  )
}
