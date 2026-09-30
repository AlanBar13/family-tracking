import { useSyncExternalStore } from 'react'
import { MENSAJE_SIN_CONEXION } from '@/lib/errores-ui'

function suscribir(cb: () => void) {
  addEventListener('online', cb)
  addEventListener('offline', cb)
  return () => {
    removeEventListener('online', cb)
    removeEventListener('offline', cb)
  }
}

export function useEnLinea() {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  )
}

/** Franja fija sobre la barra inferior; en el formulario (un <dialog> tapa todo) va en línea. */
export function FranjaOffline({ enLinea = false }: Readonly<{ enLinea?: boolean }>) {
  const conectado = useEnLinea()
  if (conectado) return null
  return (
    <p
      role="status"
      className={
        enLinea
          ? 'mb-3 rounded-xl bg-peligro px-3 py-2 text-sm font-medium text-papel'
          : 'fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[540px] rounded-xl bg-peligro px-3 py-2 text-center text-sm font-medium text-papel shadow-tarjeta'
      }
    >
      {MENSAJE_SIN_CONEXION}
    </p>
  )
}
