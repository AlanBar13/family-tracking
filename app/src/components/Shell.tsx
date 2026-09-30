import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { clienteNavegador } from '@/lib/supabase/navegador'
import { cerrarSesion } from '@/server/auth'

export function Shell({
  nombre,
  children,
}: Readonly<{ nombre: string; children: ReactNode }>) {
  const navigate = useNavigate()
  const { vista } = useSearch({ strict: false })
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
          <div role="tablist" className="flex flex-1 gap-2">
            {(['resumen', 'lista'] as const).map((v) => (
              <Link
                key={v}
                to="/"
                role="tab"
                aria-selected={vista === v}
                search={(s) => ({ ...s, vista: v === 'lista' ? v : undefined })}
                className="flex-1 py-2 text-center text-sm font-medium text-suave aria-selected:text-acento"
              >
                {v === 'resumen' ? 'Resumen' : 'Gastos'}
              </Link>
            ))}
          </div>
          <Link
            to="/"
            search={(s) => ({ ...s, nuevo: 1 as const })}
            className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-papel"
          >
            Nuevo gasto
          </Link>
        </div>
      </nav>
    </div>
  )
}
