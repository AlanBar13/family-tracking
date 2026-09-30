import { useEffect, useState } from 'react'

// Registra el service worker (solo en producción) y avisa cuando hay versión nueva.
export function ActualizacionPwa() {
  const [espera, setEspera] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    // Solo se recarga tras pedir la actualización, no en la primera instalación (clients.claim).
    const onChange = () => {
      if (sessionStorage.getItem('pwa-actualizando')) {
        sessionStorage.removeItem('pwa-actualizando')
        location.reload()
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', onChange)

    const registrar = () =>
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        const vigilar = (sw: ServiceWorker | null) => {
          sw?.addEventListener('statechange', () => {
            // Con un controller ya activo, "installed" es una actualización.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) setEspera(sw)
          })
        }
        if (reg.waiting && navigator.serviceWorker.controller) setEspera(reg.waiting)
        vigilar(reg.installing)
        reg.addEventListener('updatefound', () => vigilar(reg.installing))
      })

    if (document.readyState === 'complete') void registrar()
    else window.addEventListener('load', () => void registrar(), { once: true })
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange)
  }, [])

  if (!espera) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-tarjeta border border-linea bg-tarjeta px-4 py-3 text-sm shadow-tarjeta"
    >
      <span>Hay una versión nueva</span>
      <button
        type="button"
        className="min-h-11 font-semibold text-acento"
        onClick={() => {
          sessionStorage.setItem('pwa-actualizando', '1')
          espera.postMessage({ type: 'SKIP_WAITING' })
        }}
      >
        Actualizar
      </button>
    </div>
  )
}
