import { dinero } from '@/lib/dinero'
import {
  agruparPorDia,
  colorCategoria,
  etiquetaDia,
  nombreDeMiembro,
} from '@/lib/resumen'
import type { Estado } from '@/server/gastos-logica'
import { Vacio } from './Resumen'

export function Lista({
  estado,
  onAbrir,
}: Readonly<{ estado: Estado; onAbrir: (id: string) => void }>) {
  const { gastos, config } = estado
  if (!gastos.length) {
    return (
      <Vacio>
        <p>Sin movimientos este mes.</p>
      </Vacio>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {agruparPorDia(gastos).map((dia) => (
        <section key={dia.fecha}>
          <h2 className="mb-1.5 px-1 text-sm font-semibold text-suave">
            {etiquetaDia(dia.fecha)}
          </h2>
          <div className="divide-y divide-linea overflow-hidden rounded-tarjeta bg-tarjeta shadow-tarjeta">
            {dia.gastos.map((g) => {
              const categoria =
                config.categorias.find((c) => c.id === g.categoriaId)?.nombre ??
                'Sin especificar'
              const tipo =
                config.tiposPago.find((t) => t.id === g.tipoPagoId)?.nombre ??
                'Sin especificar'
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onAbrir(g.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <i
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: colorCategoria(g.categoriaId, config.categorias) }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.nombre}</span>
                    <span className="block truncate text-sm text-suave">
                      {categoria} · {tipo} · {nombreDeMiembro(g.autorId, config.miembros)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">{dinero(g.monto)}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
