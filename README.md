# Tracker de gastos familiares

Una app sencilla para registrar y ver los gastos de la casa entre varias
personas, hecha con Google Sheets y Google Apps Script. Sin servidores, sin
costos fijos, sin cuentas nuevas que crear — solo tu cuenta de Google.

- 📊 Los datos viven en un Google Sheet que tú controlas.
- 📱 La app se ve y se usa como una app de celular (se puede agregar a la
  pantalla de inicio).
- 👥 Cada persona entra con su propia cuenta de Google; queda registrado
  automáticamente quién capturó cada gasto.
- 📷 Opcional: escanea el ticket con la cámara y se llenan los campos solos.
- 🆓 Gratis. Todo corre en la capa gratuita de Google (y de Gemini, si usas
  el lector de tickets).

## Qué incluye

| Archivo | Para qué es |
|---|---|
| [`Codigo.gs`](./Codigo.gs) | Backend: crea las hojas, valida y guarda los gastos |
| [`Index.html`](./Index.html) | La interfaz de la app web (formulario, gráficas, lista) |
| [`Ticket.gs`](./Ticket.gs) | Opcional: lee el ticket con la cámara usando Gemini |
| [`INSTALACION.md`](./INSTALACION.md) | Instrucciones paso a paso |
| [`LECTOR-DE-TICKETS.md`](./LECTOR-DE-TICKETS.md) | Instrucciones del escáner opcional |

## Instalar

Cada persona o familia que quiera usarlo instala **su propia copia** — no es
una app compartida entre todos, sino un proyecto que cada quien monta en su
propia cuenta de Google en unos 10 minutos.

👉 Sigue [`INSTALACION.md`](./INSTALACION.md).

## Cómo se ve

- **Resumen del mes**: total, y desgloses por categoría, tipo de pago y
  persona.
- **Nuevo gasto**: monto, nombre, fecha, categoría y tipo de pago (efectivo,
  débito, crédito, transferencia); notas opcionales.
- **Lista de gastos**: agrupada por día, con edición y borrado con un toque.
- Las categorías y tipos de pago se configuran en una hoja aparte, sin tocar
  código.

## Privacidad

Tus gastos se quedan en tu propio Google Sheet, en tu propia cuenta de
Google. Nadie más que las personas a las que tú les des acceso puede verlos.
Si activas el lector de tickets, las fotos se procesan al vuelo y no se
guardan en ningún lado.

## Personalizar

Todo el comportamiento vive en tres lugares fáciles de tocar, sin ser
programador:

- **Categorías y tipos de pago**: hoja `Config` del Sheet.
- **Quién puede capturar**: también en `Config`, columna Correo.
- **Colores, textos, moneda**: arriba de `Index.html` (los colores están en
  variables `--acento`, `--peligro`, etc.) y en `dinero`/`dineroCorto` para
  cambiar de MXN a otra moneda.

## Limitaciones que vale la pena conocer

- No hay una app "central": cada instalación es independiente. Si tú mejoras
  tu copia, eso no actualiza la de tus amigos — tendrían que copiar el código
  nuevo a mano.
- Pensado para un grupo chico (una casa, un par de roomies): la lógica de
  "quién soy" depende de que cada correo esté dado de alta a mano en `Config`.
- Requiere que todas las personas que capturen tengan cuenta de Google.

## Licencia

Úsalo, cópialo y modifícalo libremente para tu propio uso.
