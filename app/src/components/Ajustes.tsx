import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { destinoLogin, traducirError } from '@/lib/errores-ui'
import type { Tipo } from '@/lib/ajustes'
import {
  activarElemento,
  actualizarMiembro,
  agregarMiembro,
  borrarElemento,
  borrarMiembro,
  crearElemento,
  fijarPresupuesto,
  obtenerAjustes,
  renombrarElemento,
  reordenarElementos,
} from '@/server/ajustes'
import { borrarSuscripcion, guardarSuscripcion } from '@/server/push'

export type Ajustes = Awaited<ReturnType<typeof obtenerAjustes>>
type Elemento = Ajustes['categorias'][number]

const tarjeta = 'mb-4 rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta'
const campo =
  'min-w-0 flex-1 rounded-lg border border-linea bg-papel px-3 py-2 disabled:opacity-60'
const botonIcono =
  'grid size-8 place-items-center rounded-full text-acento disabled:opacity-30'

export function AjustesPantalla({ inicial }: Readonly<{ inicial: Ajustes }>) {
  const [datos, setDatos] = useState(inicial)
  const [error, setError] = useState<{ seccion: string; mensaje: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const navigate = useNavigate()
  const soloLectura = !datos.esAdmin

  /** Corre una acción del servidor; si falla, el mensaje queda junto a su sección. */
  async function correr(seccion: string, accion: () => Promise<Ajustes>) {
    setOcupado(true)
    setError(null)
    try {
      setDatos(await accion())
      return true
    } catch (e) {
      const login = destinoLogin(e)
      if (login) void navigate(login)
      else setError({ seccion, mensaje: traducirError(e).mensaje })
      return false
    } finally {
      setOcupado(false)
    }
  }

  const deshabilitado = soloLectura || ocupado
  const msg = (seccion: string) =>
    error?.seccion === seccion && (
      <p role="alert" className="mt-2 text-sm text-peligro">
        {error.mensaje}
      </p>
    )

  return (
    <>
      <h2 className="mb-3 text-lg font-semibold">Ajustes</h2>
      {soloLectura && (
        <p className="mb-3 text-sm text-suave">
          Solo un administrador puede cambiar esto.
        </p>
      )}

      {(
        [
          ['categorias', 'Categorías', datos.categorias],
          ['tipos_pago', 'Tipos de pago', datos.tiposPago],
        ] as const
      ).map(([tipo, titulo, lista]) => (
        <SeccionLista
          key={tipo}
          tipo={tipo}
          titulo={titulo}
          lista={lista}
          deshabilitado={deshabilitado}
          correr={correr}
          error={msg(tipo)}
        />
      ))}

      <SeccionNotificaciones />

      <SeccionMiembros
        datos={datos}
        deshabilitado={deshabilitado}
        correr={correr}
        error={msg('miembros')}
      />
    </>
  )
}

type Correr = (seccion: string, accion: () => Promise<Ajustes>) => Promise<boolean>

function Interruptor({
  activo,
  etiqueta,
  ...props
}: Readonly<{
  activo: boolean
  etiqueta: string
  disabled: boolean
  onChange: (v: boolean) => void
}>) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-suave">
      <input
        type="checkbox"
        role="switch"
        className="size-4 accent-acento"
        checked={activo}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        aria-label={etiqueta}
      />
      Activo
    </label>
  )
}

function SeccionLista({
  tipo,
  titulo,
  lista,
  deshabilitado,
  correr,
  error,
}: Readonly<{
  tipo: Tipo
  titulo: string
  lista: Elemento[]
  deshabilitado: boolean
  correr: Correr
  error: React.ReactNode
}>) {
  const [nuevo, setNuevo] = useState('')

  async function agregar(e: FormEvent) {
    e.preventDefault()
    if (await correr(tipo, () => crearElemento({ data: { tipo, nombre: nuevo } })))
      setNuevo('')
  }

  function mover(i: number, d: -1 | 1) {
    const ids = lista.map((x) => x.id)
    ;[ids[i], ids[i + d]] = [ids[i + d]!, ids[i]!]
    return correr(tipo, () => reordenarElementos({ data: { tipo, ids } }))
  }

  return (
    <section className={tarjeta} aria-label={titulo}>
      <h3 className="mb-2 font-semibold">{titulo}</h3>
      <ul className="divide-y divide-linea">
        {lista.map((x, i) => (
          <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
            <input
              key={x.nombre}
              className={campo}
              defaultValue={x.nombre}
              disabled={deshabilitado}
              aria-label={`Nombre de ${x.nombre}`}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v !== x.nombre)
                  void correr(tipo, () =>
                    renombrarElemento({ data: { tipo, id: x.id, nombre: v } }),
                  ).then((bien) => {
                    if (!bien) e.target.value = x.nombre
                  })
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            {tipo === 'categorias' && (
              <input
                key={`p${x.presupuesto}`}
                className={`${campo} max-w-32`}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="Presupuesto"
                defaultValue={x.presupuesto ?? ''}
                disabled={deshabilitado}
                aria-label={`Presupuesto mensual de ${x.nombre}`}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  const presupuesto = v ? Number(v) : null
                  if (presupuesto !== x.presupuesto)
                    void correr(tipo, () =>
                      fijarPresupuesto({ data: { id: x.id, presupuesto } }),
                    ).then((bien) => {
                      if (!bien) e.target.value = String(x.presupuesto ?? '')
                    })
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            )}
            <Interruptor
              activo={x.activo}
              etiqueta={`${x.nombre} activo`}
              disabled={deshabilitado}
              onChange={(activo) =>
                correr(tipo, () => activarElemento({ data: { tipo, id: x.id, activo } }))
              }
            />
            <button
              type="button"
              className={botonIcono}
              aria-label={`Subir ${x.nombre}`}
              disabled={deshabilitado || i === 0}
              onClick={() => mover(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={botonIcono}
              aria-label={`Bajar ${x.nombre}`}
              disabled={deshabilitado || i === lista.length - 1}
              onClick={() => mover(i, 1)}
            >
              ↓
            </button>
            {x.gastos === 0 && !deshabilitado && (
              <button
                type="button"
                className="text-sm font-medium text-peligro"
                onClick={() => {
                  if (window.confirm(`¿Borrar "${x.nombre}"? No se puede deshacer.`))
                    void correr(tipo, () => borrarElemento({ data: { tipo, id: x.id } }))
                }}
              >
                Borrar
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={agregar} className="mt-3 flex gap-2">
        <input
          className={campo}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nombre nuevo"
          aria-label={`Agregar a ${titulo}`}
          disabled={deshabilitado}
        />
        <button
          type="submit"
          disabled={deshabilitado || !nuevo.trim()}
          className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-papel disabled:opacity-40"
        >
          Agregar
        </button>
      </form>
      {error}
    </section>
  )
}

function SeccionMiembros({
  datos,
  deshabilitado,
  correr,
  error,
}: Readonly<{
  datos: Ajustes
  deshabilitado: boolean
  correr: Correr
  error: React.ReactNode
}>) {
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')

  async function agregar(e: FormEvent) {
    e.preventDefault()
    if (await correr('miembros', () => agregarMiembro({ data: { correo, nombre } }))) {
      setCorreo('')
      setNombre('')
    }
  }

  return (
    <section className={tarjeta} aria-label="Miembros">
      <h3 className="mb-2 font-semibold">Miembros</h3>
      <ul className="divide-y divide-linea">
        {datos.miembros.map((m) => (
          <li key={m.id} className="py-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                key={m.nombre}
                className={campo}
                defaultValue={m.nombre}
                disabled={deshabilitado}
                aria-label={`Nombre de ${m.correo}`}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v !== m.nombre)
                    void correr('miembros', () =>
                      actualizarMiembro({ data: { id: m.id, nombre: v } }),
                    ).then((bien) => {
                      if (!bien) e.target.value = m.nombre
                    })
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <Interruptor
                activo={m.activo}
                etiqueta={`${m.correo} activo`}
                disabled={deshabilitado}
                onChange={(activo) =>
                  correr('miembros', () =>
                    actualizarMiembro({ data: { id: m.id, activo } }),
                  )
                }
              />
              <label className="flex items-center gap-1.5 text-sm text-suave">
                <input
                  type="checkbox"
                  className="size-4 accent-acento"
                  checked={m.esAdmin}
                  disabled={deshabilitado}
                  onChange={(e) =>
                    correr('miembros', () =>
                      actualizarMiembro({
                        data: { id: m.id, esAdmin: e.target.checked },
                      }),
                    )
                  }
                />
                Admin
              </label>
              {m.gastos === 0 && m.id !== datos.yoId && !deshabilitado && (
                <button
                  type="button"
                  className="text-sm font-medium text-peligro"
                  onClick={() => {
                    if (window.confirm(`¿Borrar a "${m.nombre}"? No se puede deshacer.`))
                      void correr('miembros', () => borrarMiembro({ data: { id: m.id } }))
                  }}
                >
                  Borrar
                </button>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-suave">{m.correo}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={agregar} className="mt-3 flex flex-wrap gap-2">
        <input
          className={campo}
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="Correo"
          aria-label="Correo del miembro nuevo"
          disabled={deshabilitado}
        />
        <input
          className={campo}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          aria-label="Nombre del miembro nuevo"
          disabled={deshabilitado}
        />
        <button
          type="submit"
          disabled={deshabilitado || !correo.trim() || !nombre.trim()}
          className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-papel disabled:opacity-40"
        >
          Agregar
        </button>
      </form>
      <p className="mt-3 text-xs text-suave">
        Mientras la app de Google esté en modo «Prueba», el miembro nuevo también debe
        estar como <strong>usuario de prueba</strong> en Google Cloud Console; si no,
        Google no lo deja entrar.
      </p>
      {error}
    </section>
  )
}

type EstadoPush = 'cargando' | 'no-soportado' | 'bloqueado' | 'activo' | 'inactivo'

/** Suscripción Web Push de este dispositivo; el aviso de presupuesto llega a todos los suscritos. */
function SeccionNotificaciones() {
  const [estado, setEstado] = useState<EstadoPush>('cargando')
  const [error, setError] = useState('')

  useEffect(() => {
    async function leer(): Promise<EstadoPush> {
      if (!('serviceWorker' in navigator) || !('PushManager' in window))
        return 'no-soportado'
      if (Notification.permission === 'denied') return 'bloqueado'
      // En dev ActualizacionPwa no registra el SW; sin él no hay push.
      const reg = await navigator.serviceWorker.register('/sw.js')
      return (await reg.pushManager.getSubscription()) ? 'activo' : 'inactivo'
    }
    void leer().then(setEstado)
  }, [])

  async function activar() {
    setError('')
    try {
      if ((await Notification.requestPermission()) !== 'granted')
        return setEstado('bloqueado')
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      })
      const { endpoint, keys } = sub.toJSON()
      await guardarSuscripcion({
        data: { endpoint: endpoint!, keys: { p256dh: keys!.p256dh!, auth: keys!.auth! } },
      })
      setEstado('activo')
    } catch (e) {
      setError(traducirError(e).mensaje)
    }
  }

  async function desactivar() {
    setError('')
    try {
      const sub = await (
        await navigator.serviceWorker.ready
      ).pushManager.getSubscription()
      if (sub) {
        await borrarSuscripcion({ data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      setEstado('inactivo')
    } catch (e) {
      setError(traducirError(e).mensaje)
    }
  }

  const texto: Record<EstadoPush, string> = {
    cargando: '',
    'no-soportado':
      'Este navegador no admite notificaciones. En iPhone, primero instala la app en la pantalla de inicio.',
    bloqueado:
      'Las notificaciones están bloqueadas en este navegador. Actívalas en sus ajustes.',
    activo:
      'Este dispositivo recibe avisos cuando una categoría llega al 80% o se pasa de su presupuesto.',
    inactivo:
      'Recibe un aviso cuando una categoría llegue al 80% o se pase de su presupuesto.',
  }

  return (
    <section className={tarjeta} aria-label="Notificaciones">
      <h3 className="mb-2 font-semibold">Notificaciones</h3>
      <p className="text-sm text-suave">{texto[estado]}</p>
      {(estado === 'activo' || estado === 'inactivo') && (
        <button
          type="button"
          onClick={estado === 'activo' ? desactivar : activar}
          className="mt-3 rounded-full bg-acento px-4 py-2 text-sm font-semibold text-papel"
        >
          {estado === 'activo'
            ? 'Desactivar en este dispositivo'
            : 'Activar en este dispositivo'}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-peligro">
          {error}
        </p>
      )}
    </section>
  )
}
