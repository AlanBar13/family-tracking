# Paso 07 — Lector de tickets con Gemini

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§2.5 y §5) y confirma en la bitácora que el paso 06
  está ✅.
- Lee `Ticket.gs` **completo** (en la raíz) y `comprimir()`, `escanear()` y
  `estadoEscaner()` en `Index.html`. Aquí se portan tal cual, con la
  instrucción del modelo y el esquema copiados textualmente.
- Consulta la documentación actual de la API de Gemini (`generateContent`,
  `responseSchema` y el header `x-goog-api-key`) y confirma que el modelo por
  omisión sigue existiendo en ai.google.dev/gemini-api/docs/models. Si ya no
  existe, propón el reemplazo más parecido, **pregúntale al usuario** y anótalo.

## Objetivo

Un botón "Escanear ticket" en el formulario que tome una foto y proponga el
monto, el nombre, la fecha, la categoría y el tipo de pago, sin guardar nada
hasta que la persona confirme.

## Tareas

1. **Lógica pura** en `src/lib/ticket.ts`, con pruebas:
   - `empatar(valor, lista, respaldo)`: sin acentos (NFD) ni mayúsculas;
     primero coincidencia exacta y luego "contiene";
   - `instruccionTicket({ hoy, categorias, tiposPago })`: el texto
     **idéntico** al de `instruccion_()`;
   - `ESQUEMA_TICKET`;
   - `interpretarRespuesta(crudo, config, hoy)`: aplica las reglas de monto,
     fecha, nombre (60 caracteres), categoría, tipo de pago y aviso de
     CONTEXTO §2.5.
2. **Server function** `leerTicket({ base64 })` en `src/server/ticket.ts`:
   - usa `requerirMiembro()`;
   - valida con Zod: string no vacío, límite de 4 MB con su mensaje;
   - lee `GEMINI_API_KEY` y `GEMINI_MODELO` **solo** en el servidor. Si falta
     la llave, lanza `EXTERNO` con "El lector de tickets no está configurado.";
   - arma la instrucción con las categorías y tipos de pago **activos**;
   - hace `fetch` a Gemini con timeout (`AbortSignal.timeout(45_000)`);
   - traduce los errores 429, 400 con "API key" y la respuesta ilegible a los
     mensajes de CONTEXTO §2.5. Cualquier otro error pasa a un `EXTERNO`
     genérico, con el detalle solo en `console.error`;
   - devuelve `{ nombre, monto, fecha, categoriaId, tipoPagoId, aviso }`,
     resolviendo los nombres a ids;
   - no escribe en la base.
3. **Cliente:**
   - `src/lib/comprimir-imagen.ts`: el port de `comprimir()` (1280 px, fondo
     blanco, JPEG 0.72, base64 sin el prefijo). Si el navegador lo soporta, usa
     `createImageBitmap`; si no, `FileReader` + `Image`.
   - En el slot del formulario va el botón "Escanear ticket" con un ícono de
     cámara y la línea de apoyo "Toma la foto y se llenan los campos".
   - Usa `<input type="file" accept="image/*" capture="environment">`, oculto.
   - Mientras lee: el botón y "Guardar" se deshabilitan y la línea de apoyo
     dice "Leyendo el ticket…".
   - Al terminar: llena **solo** los campos que llegaron, la línea de apoyo
     muestra el `aviso` y el foco va al nombre.
   - Si hay error: se muestra en el aviso del formulario y los campos no se
     tocan.
   - El input se limpia después de cada foto, para poder repetir con la misma
     imagen.
4. Agrega `GEMINI_API_KEY` y `GEMINI_MODELO` a `.env.example`, si no estaban,
   con un comentario sobre dónde obtenerlas (aistudio.google.com/apikey).
5. Crea el script `pnpm probar:gemini`: una llamada mínima que imprime el código
   HTTP. Es el equivalente de `probarGemini()`.

## Fuera de alcance

Guardar la foto (**nunca** se guarda), guardar el gasto sin confirmación y
llamar a Gemini desde el cliente.

## Criterios de aceptación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` pasan.
- Hay pruebas de `empatar` (acentos, mayúsculas, "contiene" y respaldo), de
  `interpretarRespuesta` (sin total, confianza baja, nota del modelo, fecha
  inválida) y de la server function con `fetch` simulado (200, 429, 400 con API
  key y JSON roto).
- La instrucción generada es idéntica a la de `Ticket.gs` para la misma
  entrada (con una prueba de *snapshot* o comparación de texto).
- Si hay llave disponible: con una foto real de un ticket, se llenan los
  campos. Si no hay llave, se muestra el mensaje "no está configurado".
- En el bundle del cliente no aparecen `GEMINI_API_KEY` ni
  `generativelanguage` (búscalos en la salida del build).

## Pasos manuales del usuario

- Generar la llave en aistudio.google.com/apikey y ponerla en `app/.env` como
  `GEMINI_API_KEY`.

## Al terminar

Actualiza la bitácora (paso 07 y el modelo confirmado). Resume y **detente**.
