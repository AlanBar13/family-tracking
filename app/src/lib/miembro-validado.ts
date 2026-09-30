import type { Sesion } from '@/server/auth'

type Miembro = Extract<Sesion, { estado: 'ok' }>['miembro']

// ponytail: último miembro validado en este navegador. Sin red se sigue con él en vez de
// tirar la captura; vive en su propio módulo porque el code splitting de las rutas
// duplicaría una variable declarada en el archivo de la ruta.
export const miembroValidado: { actual?: Miembro } = {}
