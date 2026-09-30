import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { clienteNavegador } from '@/lib/supabase/navegador'
import { mensajeNoAutorizado } from '@/lib/errores'

type BusquedaLogin = { error?: 'no_autorizado' | 'sesion'; correo?: string }

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): BusquedaLogin => ({
    error: s.error === 'no_autorizado' || s.error === 'sesion' ? s.error : undefined,
    correo: typeof s.correo === 'string' ? s.correo : undefined,
  }),
  component: Login,
})

function Login() {
  const { error, correo } = Route.useSearch()
  const [cargando, setCargando] = useState(false)
  const [fallo, setFallo] = useState(false)

  const mensaje =
    error === 'no_autorizado'
      ? mensajeNoAutorizado(correo ?? 'que usaste')
      : error === 'sesion' || fallo
        ? 'No se pudo iniciar sesión. Intenta de nuevo.'
        : null

  async function entrar() {
    setCargando(true)
    setFallo(false)
    const { error: e } = await clienteNavegador().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (e) {
      console.error('signInWithOAuth falló', e)
      setFallo(true)
      setCargando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Gastos de la casa</h1>
        <p className="mt-1 text-suave">
          Registra y revisa los gastos del hogar entre todos.
        </p>
      </div>
      {mensaje && (
        <p
          role="alert"
          className="rounded-tarjeta border border-peligro p-3 text-sm text-peligro"
        >
          {mensaje}
        </p>
      )}
      <button
        type="button"
        onClick={entrar}
        disabled={cargando}
        className="rounded-full bg-acento px-4 py-3 font-semibold text-papel disabled:opacity-60"
      >
        {cargando ? 'Abriendo Google…' : 'Entrar con Google'}
      </button>
    </main>
  )
}
