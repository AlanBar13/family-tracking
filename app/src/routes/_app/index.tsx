import {
  createFileRoute,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { Lista } from '@/components/Lista'
import { PanelGasto } from '@/components/PanelGasto'
import { Resumen } from '@/components/Resumen'
import { destinoLogin } from '@/lib/errores-ui'
import { esMesValido } from '@/lib/fechas'
import { etiquetaMes, mesRelativo } from '@/lib/resumen'
import { obtenerEstado } from '@/server/gastos'

type Busqueda = {
  mes?: string
  vista?: 'resumen' | 'lista'
  editar?: string
  nuevo?: 1
}

export const Route = createFileRoute('/_app/')({
  // Lo inválido se descarta: sin mes vale el mes actual, sin vista vale el resumen.
  validateSearch: (s: Record<string, unknown>): Busqueda => ({
    mes: esMesValido(s.mes) ? s.mes : undefined,
    vista: s.vista === 'lista' ? 'lista' : undefined,
    editar: typeof s.editar === 'string' && s.editar ? s.editar : undefined,
    nuevo: s.nuevo === 1 || s.nuevo === '1' ? 1 : undefined,
  }),
  loaderDeps: ({ search }) => ({ mes: search.mes }),
  loader: async ({ deps }) => {
    try {
      return await obtenerEstado({ data: { mes: deps.mes } })
    } catch (e) {
      const login = destinoLogin(e)
      if (login) throw redirect(login)
      throw e
    }
  },
  component: Inicio,
})

const boton =
  'grid size-10 place-items-center rounded-full text-2xl text-acento disabled:opacity-30'

function Inicio() {
  const estado = Route.useLoaderData()
  const { vista, nuevo, editar } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const cargando = useRouterState({ select: (s) => s.isLoading })
  const irA = (mes: string) => navigate({ search: (s) => ({ ...s, mes }) })
  // Cierra el panel reemplazando la entrada, así "atrás" no lo reabre.
  const cerrar = (mes?: string) =>
    navigate({
      replace: true,
      search: (s) => ({ ...s, mes: mes ?? s.mes, nuevo: undefined, editar: undefined }),
    })
  // Otro mes: el cambio de ?mes recarga el loader. Mismo mes: hay que invalidar.
  const listo = async (mes: string) => {
    await cerrar(mes)
    if (mes === estado.mes) await router.invalidate()
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          className={boton}
          onClick={() => irA(mesRelativo(estado.mes, -1))}
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold">{etiquetaMes(estado.mes)}</h2>
        <button
          type="button"
          aria-label="Mes siguiente"
          className={boton}
          disabled={estado.mes >= estado.hoy.slice(0, 7)}
          onClick={() => irA(mesRelativo(estado.mes, 1))}
        >
          ›
        </button>
      </div>
      <div
        aria-busy={cargando}
        className={cargando ? 'opacity-50 transition-opacity' : 'transition-opacity'}
      >
        {vista === 'lista' ? (
          <Lista
            estado={estado}
            onAbrir={(id) => navigate({ search: (s) => ({ ...s, editar: id }) })}
          />
        ) : (
          <Resumen estado={estado} />
        )}
      </div>
      {(nuevo || editar) && (
        <PanelGasto
          key={editar ?? 'nuevo'}
          estado={estado}
          editarId={editar}
          onCerrar={() => cerrar()}
          onListo={listo}
        />
      )}
    </>
  )
}
