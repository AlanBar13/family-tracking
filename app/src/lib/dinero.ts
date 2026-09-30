const formato = (decimales: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })

const conDecimales = formato(2)
const sinDecimales = formato(0)

/** Monto en MXN con 2 decimales: $1,234.50 */
export const dinero = (monto: number) => conDecimales.format(monto)

/** Monto en MXN sin decimales: $1,235 */
export const dineroCorto = (monto: number) => sinDecimales.format(monto)

/** Pesos → centavos enteros (10.50 → 1050). */
export const aCentavos = (monto: number) => Math.round(monto * 100)

/** Centavos enteros → pesos (1600 → 16). */
export const deCentavos = (centavos: number) => centavos / 100

/** Suma en centavos enteros y regresa pesos: evita 0.1 + 0.2 = 0.30000000000000004. */
export const sumar = (montos: number[]) =>
  deCentavos(montos.reduce((total, m) => total + aCentavos(m), 0))
