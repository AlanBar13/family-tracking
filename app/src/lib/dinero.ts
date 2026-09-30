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
