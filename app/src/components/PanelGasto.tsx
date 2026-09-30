import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { destinoLogin, traducirError } from '@/lib/errores-ui'
import { FranjaOffline } from './FranjaOffline'
import { fetchConTimeout, TIMEOUT_TICKET } from '@/lib/fetch-timeout'
import { MENSAJES } from '@/lib/mensajes'
import { aErrorVisible, gastoEntrada } from '@/lib/validacion'
import { comprimirImagen } from '@/lib/comprimir-imagen'
import { actualizarGasto, agregarGasto, borrarGasto } from '@/server/gastos'
import { leerTicket } from '@/server/ticket'
import type { Estado } from '@/server/gastos-logica'

/** <dialog> modal: trampa de foco y Escape nativos; aquí solo bloqueo de scroll y regreso del foco. */
function useModal(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialogo = ref.current
    const previo = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    if (dialogo && !dialogo.open) dialogo.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      previo?.focus()
    }
  }, [ref])
}

const campo =
  'w-full rounded-xl border border-linea bg-papel px-3 py-2.5 text-base outline-acento'
const etiqueta = 'mb-1 block text-sm font-medium text-suave'

type Props = Readonly<{
  estado: Estado
  editarId?: string
  onCerrar: () => void
  /** Se llama tras guardar (con el mes del gasto) o borrar (con el mes visto). */
  onListo: (mes: string) => void
}>

export function PanelGasto({ estado, editarId, onCerrar, onListo }: Props) {
  const { config, mes, hoy } = estado
  const gasto = editarId ? estado.gastos.find((g) => g.id === editarId) : undefined
  const dialogo = useRef<HTMLDialogElement>(null)
  const montoRef = useRef<HTMLInputElement>(null)
  const avisoRef = useRef<HTMLParagraphElement>(null)
  const enCurso = useRef(false)
  const navigate = useNavigate()
  useModal(dialogo)

  const [monto, setMonto] = useState(gasto ? String(gasto.monto) : '')
  const [nombre, setNombre] = useState(gasto?.nombre ?? '')
  const [fecha, setFecha] = useState(
    gasto?.fecha ?? (mes === hoy.slice(0, 7) ? hoy : `${mes}-01`),
  )
  const [categoriaId, setCategoriaId] = useState(
    gasto?.categoriaId ?? config.categorias.find((c) => c.activa)?.id ?? '',
  )
  const [tipoPagoId, setTipoPagoId] = useState(
    gasto?.tipoPagoId ?? config.tiposPago.find((t) => t.activo)?.id ?? '',
  )
  const [notas, setNotas] = useState(gasto?.notas ?? '')
  const [accion, setAccion] = useState<'guardar' | 'borrar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [apoyo, setApoyo] = useState<string | null>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  const nombreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editarId) montoRef.current?.focus()
  }, [editarId])
  useEffect(() => {
    if (error) avisoRef.current?.scrollIntoView({ block: 'nearest' })
  }, [error])

  /** Error del servidor o de red: sesión vencida → login; lo demás, mensaje junto al formulario. */
  function fallar(e: unknown) {
    const login = destinoLogin(e)
    if (login) void navigate(login)
    else setError(traducirError(e).mensaje)
  }

  async function ejecutar(a: 'guardar' | 'borrar', f: () => Promise<string>) {
    if (enCurso.current) return
    enCurso.current = true
    setAccion(a)
    setError(null)
    try {
      onListo(await f())
    } catch (e) {
      fallar(e)
      setConfirmando(false)
    } finally {
      enCurso.current = false
      setAccion(null)
    }
  }

  function guardar() {
    if (!fecha) return setError(MENSAJES.fechaVacia)
    const r = gastoEntrada.safeParse({
      nombre,
      monto: parseFloat(monto.replace(/[^0-9.]/g, '')),
      fecha,
      categoriaId,
      tipoPagoId,
      notas,
    })
    if (!r.success) return setError(aErrorVisible(r.error))
    void ejecutar('guardar', async () => {
      const data = r.data
      if (gasto) await actualizarGasto({ data: { ...data, id: gasto.id } })
      else await agregarGasto({ data })
      return data.fecha.slice(0, 7)
    })
  }

  function borrar() {
    if (!gasto) return
    void ejecutar('borrar', async () => {
      await borrarGasto({ data: { id: gasto.id, mes } })
      return mes
    })
  }

  async function escanear(input: HTMLInputElement) {
    const archivo = input.files?.[0]
    input.value = '' // para poder repetir con la misma imagen
    if (!archivo || enCurso.current) return
    enCurso.current = true
    setLeyendo(true)
    setError(null)
    try {
      const p = await leerTicket({
        data: { base64: await comprimirImagen(archivo) },
        fetch: fetchConTimeout(TIMEOUT_TICKET),
      })
      if (p.monto) setMonto(String(p.monto))
      if (p.nombre) setNombre(p.nombre)
      if (p.fecha) setFecha(p.fecha)
      if (p.categoriaId) setCategoriaId(p.categoriaId)
      if (p.tipoPagoId) setTipoPagoId(p.tipoPagoId)
      setApoyo(p.aviso)
      nombreRef.current?.focus()
    } catch (e) {
      fallar(e)
    } finally {
      enCurso.current = false
      setLeyendo(false)
    }
  }

  const ocupado = accion !== null || leyendo
  const titulo = editarId ? 'Editar gasto' : 'Nuevo gasto'
  const categorias = config.categorias.filter((c) => c.activa || c.id === gasto?.categoriaId)
  const tipos = config.tiposPago.filter((t) => t.activo || t.id === gasto?.tipoPagoId)

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="panel-titulo"
      onCancel={(e) => {
        e.preventDefault()
        if (!ocupado) onCerrar()
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-papel p-0 text-tinta backdrop:bg-black/40 md:m-auto md:h-auto md:max-h-[90dvh] md:max-w-md md:rounded-tarjeta"
    >
      <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="panel-titulo" className="text-lg font-semibold">
            {titulo}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={ocupado}
            onClick={onCerrar}
            className="grid size-10 place-items-center rounded-full text-2xl text-suave disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {editarId && !gasto ? (
          <p role="alert" className="text-peligro">
            {MENSAJES.gastoNoExiste}
          </p>
        ) : (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              guardar()
            }}
          >
            <FranjaOffline enLinea />
            {error && (
              <p
                ref={avisoRef}
                role="alert"
                className="rounded-xl border border-peligro px-3 py-2 text-peligro"
              >
                {error}
              </p>
            )}

            <div>
              <input
                ref={fotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => void escanear(e.target)}
              />
              <button
                type="button"
                disabled={ocupado}
                onClick={() => fotoRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-acento px-4 py-3 font-semibold text-acento disabled:opacity-60"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Escanear ticket
              </button>
              <p aria-live="polite" className="mt-1 text-center text-sm text-suave">
                {leyendo ? 'Leyendo el ticket…' : (apoyo ?? 'Toma la foto y se llenan los campos')}
              </p>
            </div>

            <label>
              <span className={etiqueta}>Monto</span>
              <input
                ref={montoRef}
                inputMode="decimal"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className={`${campo} text-3xl font-semibold tabular-nums`}
              />
            </label>

            <label>
              <span className={etiqueta}>Nombre del gasto</span>
              <input
                ref={nombreRef}
                placeholder="Súper de la semana"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={campo}
              />
            </label>

            <label>
              <span className={etiqueta}>Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={campo}
              />
            </label>

            <label>
              <span className={etiqueta}>Categoría</span>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className={campo}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.activa ? '' : ' (inactiva)'}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className={etiqueta}>Tipo de pago</legend>
              <div className="flex flex-wrap gap-2">
                {tipos.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={tipoPagoId === t.id}
                    onClick={() => setTipoPagoId(t.id)}
                    className="rounded-full border border-linea px-4 py-2 text-sm aria-pressed:border-acento aria-pressed:bg-acento aria-pressed:text-papel"
                  >
                    {t.nombre}
                    {t.activo ? '' : ' (inactivo)'}
                  </button>
                ))}
              </div>
            </fieldset>

            <label>
              <span className={etiqueta}>Notas (opcional)</span>
              <textarea
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className={campo}
              />
            </label>

            <button
              type="submit"
              disabled={ocupado}
              className="rounded-full bg-acento px-4 py-3 font-semibold text-papel disabled:opacity-60"
            >
              {accion === 'guardar' ? 'Guardando…' : 'Guardar'}
            </button>
            {gasto && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => setConfirmando(true)}
                className="rounded-full border border-peligro px-4 py-3 font-semibold text-peligro disabled:opacity-60"
              >
                Borrar este gasto
              </button>
            )}
          </form>
        )}
      </div>

      {confirmando && gasto && (
        <Confirmar
          ocupado={accion === 'borrar'}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={borrar}
        >
          ¿Borrar "{gasto.nombre}"? No se puede deshacer.
        </Confirmar>
      )}
    </dialog>
  )
}

function Confirmar({
  children,
  ocupado,
  onCancelar,
  onConfirmar,
}: Readonly<{
  children: ReactNode
  ocupado: boolean
  onCancelar: () => void
  onConfirmar: () => void
}>) {
  const dialogo = useRef<HTMLDialogElement>(null)
  useModal(dialogo)
  return (
    <dialog
      ref={dialogo}
      aria-labelledby="confirmar-texto"
      onCancel={(e) => {
        e.preventDefault()
        if (!ocupado) onCancelar()
      }}
      className="m-auto w-[min(90vw,24rem)] rounded-tarjeta bg-tarjeta p-5 text-tinta backdrop:bg-black/50"
    >
      <p id="confirmar-texto" className="mb-4 font-medium">
        {children}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={onCancelar}
          className="rounded-full px-4 py-2 font-medium text-suave disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={onConfirmar}
          className="rounded-full bg-peligro px-4 py-2 font-semibold text-papel disabled:opacity-60"
        >
          {ocupado ? 'Borrando…' : 'Borrar'}
        </button>
      </div>
    </dialog>
  )
}
