import { useState, type FormEvent } from 'react'
import { leerErrorApp } from '@/lib/errores'
import type { Tipo } from '@/lib/ajustes'
import {
  activarElemento,
  actualizarMiembro,
  agregarMiembro,
  borrarElemento,
  borrarMiembro,
  crearElemento,
  obtenerAjustes,
  renombrarElemento,
  reordenarElementos,
} from '@/server/ajustes'

export type Ajustes = Awaited<ReturnType<typeof obtenerAjustes>>
type Elemento = Ajustes['categorias'][number]

const tarjeta = 'mb-4 rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta'
const campo =
  'min-w-0 flex-1 rounded-lg border border-linea bg-papel px-3 py-2 disabled:opacity-60'
const botonIcono = 'grid size-8 place-items-center rounded-full text-acento disabled:opacity-30'

export function AjustesPantalla({ inicial }: Readonly<{ inicial: Ajustes }>) {
  const [datos, setDatos] = useState(inicial)
  const [error, setError] = useState<{ seccion: string; mensaje: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const soloLectura = !datos.esAdmin

  /** Corre una acción del servidor; si falla, el mensaje queda junto a su sección. */
  async function correr(seccion: string, accion: () => Promise<Ajustes>) {
    setOcupado(true)
    setError(null)
    try {
      setDatos(await accion())
      return true
    } catch (e) {
      setError({ seccion, mensaje: leerErrorApp(e).mensaje })
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
        <p className="mb-3 text-sm text-suave">Solo un administrador puede cambiar esto.</p>
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
    if (await correr(tipo, () => crearElemento({ data: { tipo, nombre: nuevo } }))) setNuevo('')
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
                  correr('miembros', () => actualizarMiembro({ data: { id: m.id, activo } }))
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
                      actualizarMiembro({ data: { id: m.id, esAdmin: e.target.checked } }),
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
        Mientras la app de Google esté en modo «Prueba», el miembro nuevo también debe estar como{' '}
        <strong>usuario de prueba</strong> en Google Cloud Console; si no, Google no lo deja
        entrar.
      </p>
      {error}
    </section>
  )
}
