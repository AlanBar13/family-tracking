import { Link, createRouter } from '@tanstack/react-router'
import { PantallaError } from '@/components/PantallaError'
import { routeTree } from './routeTree.gen'

function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-suave">Esa dirección no existe.</p>
      <Link to="/" className="font-medium text-acento">
        Ir al inicio
      </Link>
    </main>
  )
}

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: NoEncontrado,
    defaultErrorComponent: PantallaError,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
