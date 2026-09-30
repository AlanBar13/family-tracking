import { dinero, dineroCorto, sumar } from '@/lib/dinero'
import {
  acumular,
  anchoBarra,
  colorCategoria,
  colorPersona,
  nombreDeMiembro,
  porcentaje,
} from '@/lib/resumen'
import type { Estado } from '@/server/gastos-logica'

export function Vacio({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="rounded-tarjeta bg-tarjeta p-6 text-center text-suave shadow-tarjeta">
      {children}
    </div>
  )
}

type FilaBarra = { etiqueta: string; total: number; color: string }

function Desglose({
  titulo,
  filas,
  total,
}: Readonly<{ titulo: string; filas: FilaBarra[]; total: number }>) {
  const mayor = filas[0]?.total ?? 0
  return (
    <section className="rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta">
      <h2 className="mb-3 text-sm font-semibold text-suave">{titulo}</h2>
      <div className="flex flex-col gap-3">
        {filas.map((f) => (
          <div key={f.etiqueta}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{f.etiqueta}</span>
              <span className="shrink-0">
                {dinero(f.total)} · {porcentaje(f.total, total)}%
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-linea">
              <div
                className="h-full rounded-full"
                style={{ width: `${anchoBarra(f.total, mayor)}%`, background: f.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Resumen({ estado }: Readonly<{ estado: Estado }>) {
  const { gastos, config } = estado
  if (!gastos.length) {
    return (
      <Vacio>
        <p>Todavía no hay gastos en este mes.</p>
        <p>Agrega el primero con el botón de abajo.</p>
      </Vacio>
    )
  }

  const total = sumar(gastos.map((g) => g.monto))
  const nombreCat = (id: string) =>
    config.categorias.find((c) => c.id === id)?.nombre ?? 'Sin especificar'
  const nombreTipo = (id: string) =>
    config.tiposPago.find((t) => t.id === id)?.nombre ?? 'Sin especificar'

  const porCategoria = acumular(gastos, (g) => g.categoriaId).map((f) => ({
    etiqueta: nombreCat(f.clave),
    total: f.total,
    color: colorCategoria(f.clave, config.categorias),
  }))
  const porTipo = acumular(gastos, (g) => g.tipoPagoId).map((f) => ({
    etiqueta: nombreTipo(f.clave),
    total: f.total,
    color: 'var(--acento)',
  }))
  const porPersona = acumular(gastos, (g) => g.autorId).map((f, i) => ({
    etiqueta: nombreDeMiembro(f.clave, config.miembros),
    total: f.total,
    color: colorPersona(i),
  }))

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-tarjeta bg-tarjeta p-4 shadow-tarjeta">
        <div className="text-4xl font-semibold">{dinero(total)}</div>
        <div className="mt-1 text-sm text-suave">
          {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'} · promedio{' '}
          {dineroCorto(total / gastos.length)}
        </div>
        <div
          className="mt-3 flex h-3 overflow-hidden rounded-full bg-linea"
          aria-hidden="true"
        >
          {porCategoria.map((f) => (
            <span
              key={f.etiqueta}
              style={{ width: `${(f.total / total) * 100}%`, background: f.color }}
            />
          ))}
        </div>
      </section>
      <Desglose titulo="Por categoría" filas={porCategoria} total={total} />
      <Desglose titulo="Por tipo de pago" filas={porTipo} total={total} />
      <Desglose titulo="Por persona" filas={porPersona} total={total} />
    </div>
  )
}
