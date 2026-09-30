import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { clienteNavegador } from '@/lib/supabase/navegador'
import { cerrarSesion } from '@/server/auth'

// TODO(paso-05): pestañas Resumen y Gastos con navegación real.
// TODO(paso-06): el botón "Nuevo gasto" abre el formulario.
export function Shell({
  nombre,
  children,
}: Readonly<{ nombre: string; children: ReactNode }>) {
  const navigate = useNavigate()
  const [saliendo, setSaliendo] = useState(false)

  async function salir() {
    setSaliendo(true)
    try {
      await cerrarSesion()
      await clienteNavegador().auth.signOut()
    } catch (e) {
      console.error('cerrar sesión falló', e)
    }
    await navigate({ to: '/login' })
  }

  return (
    <div className="min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-10 border-b border-linea bg-papel pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-[560px] px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="truncate text-lg font-semibold">Capturando como {nombre}</h1>
            <button
              type="button"
              onClick={salir}
              disabled={saliendo}
              className="text-sm font-medium text-suave disabled:opacity-60"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[560px] px-4 pt-[calc(64px+env(safe-area-inset-top))] pb-[calc(86px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-linea bg-papel pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-[560px] items-center gap-2 px-4 py-2.5">
          <span className="flex-1 text-center text-sm font-medium text-acento">
            Resumen
          </span>
          <span className="flex-1 text-center text-sm font-medium text-suave">
            Gastos
          </span>
          <span className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-papel">
            Nuevo gasto
          </span>
        </div>
      </nav>
    </div>
  )
}
