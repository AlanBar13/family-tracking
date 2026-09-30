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
            <Link
              to="/ajustes"
              aria-label="Ajustes"
              className="ml-auto grid size-8 place-items-center text-suave"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </Link>
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
