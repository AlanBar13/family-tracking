/** Mensajes visibles al usuario (CONTEXTO §2.1 y §6). */
export const MENSAJES = {
  nombreVacio: 'Ponle un nombre al gasto.',
  nombreLargo: 'El nombre es demasiado largo (máximo 120 caracteres).',
  montoInvalido: 'El monto debe ser mayor a cero.',
  fechaVacia: 'Elige la fecha del gasto.',
  fechaInvalida:'La fecha no es válida.',
  categoriaInvalida: 'Esa categoría no existe. Revísala en Ajustes.',
  tipoPagoInvalido: 'Ese tipo de pago no existe. Revísalo en Ajustes.',
  gastoNoExiste: 'Ese gasto ya no existe.',
  notasLargas: 'Las notas son demasiado largas (máximo 500 caracteres).',
  interno: 'Algo salió mal. Intenta de nuevo.',
} as const
