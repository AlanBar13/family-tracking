import { aCentavos, dineroCorto } from './dinero'

export type Umbral = 80 | 100

/** Mayor umbral (% del presupuesto) que el total cruzó al pasar de `antes` a `despues`. */
export function umbralCruzado(
  antes: number,
  despues: number,
  presupuesto: number,
): Umbral | null {
  const a = aCentavos(antes) * 100
  const d = aCentavos(despues) * 100
  const p = aCentavos(presupuesto)
  for (const u of [100, 80] as const) if (a < p * u && d >= p * u) return u
  return null
}

export function mensajeAviso(
  categoria: string,
  total: number,
  presupuesto: number,
  umbral: Umbral,
) {
  const cifras = `${dineroCorto(total)} de ${dineroCorto(presupuesto)}`
  return umbral === 100
    ? {
        title: `${categoria}: te pasaste del presupuesto`,
        body: `Llevan ${cifras} este mes.`,
      }
    : {
        title: `${categoria}: ${Math.floor((total / presupuesto) * 100)}% del presupuesto`,
        body: `Llevan ${cifras} este mes.`,
      }
}
