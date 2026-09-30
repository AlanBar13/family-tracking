import { useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { traducirError } from '@/lib/errores-ui'

/**
 * Error de ruta (loader o render). `recargar` es para el límite raíz: si falló
 * el render de toda la app, reintentar la ruta no basta.
 */
export function PantallaError({
  error,
  reset,
  recargar = false,
}: Readonly<{ error: unknown; reset?: () => void; recargar?: boolean }>) {
  const router = useRouter()
  const { titulo, mensaje, accion } = traducirError(error)
  useEffect(() => console.error('Error de pantalla', error), [error])
  const boton = 'mt-3 font-medium text-acento'
  return (
    <section
      role="alert"
      className="mx-auto my-6 max-w-[420px] rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta"
    >
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="mt-1 text-peligro">{mensaje}</p>
      {accion === 'login' ? (
        <Link to="/login" className={`${boton} inline-block`}>
          Ir a iniciar sesión
        </Link>
      ) : recargar ? (
        <button type="button" onClick={() => location.reload()} className={boton}>
          Recargar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            reset?.()
            void router.invalidate()
          }}
          className={boton}
        >
          Reintentar
        </button>
      )}
    </section>
  )
}
