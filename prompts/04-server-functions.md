# Paso 04 — Server functions de gastos

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§2.1, §2.2, §4 y §6) y confirma en la bitácora que el
  paso 03 está ✅.
- Lee `Codigo.gs` en la raíz: `obtenerEstado`, `validar_`, `agregarGasto`,
  `actualizarGasto` y `borrarGasto`. Aquí se porta su lógica.
- Consulta la documentación actual de `createServerFn` (validación del input,
  middleware y manejo de errores).

## Objetivo

Una API tipada y validada para leer el estado del mes y para crear, editar y
borrar gastos, con las mismas reglas de la versión anterior y con pruebas.

## Tareas

1. **Lógica pura** en `src/lib/` (sin Supabase, 100 % testeable):
   - `mensajes.ts`: todos los mensajes de CONTEXTO §2.1, como constantes.
   - `fechas.ts`:
     - `hoyEnZona(zona)` → `yyyy-MM-dd`;
     - `mesActual(zona)` → `yyyy-MM`;
     - `normalizarMes(texto, zona)`, que valida `yyyy-MM` y, si no es válido,
       usa el mes actual;
     - `rangoDelMes(mes)` → `{ desde, hasta }`;
     - `listaDeMeses(mesesConGastos, mesActual)`, sin duplicados y en orden
       descendente;
     - `fechaPorOmision(mesVisto, hoy)`.

     Todo con `Intl.DateTimeFormat` y `timeZone`, **nunca** con la hora local
     del servidor.
   - `validacion.ts`: el esquema Zod `gastoEntrada` (`nombre`, `monto`,
     `fecha`, `categoriaId`, `tipoPagoId`, `notas`), con los mensajes exactos,
     recorte de espacios y redondeo del monto a 2 decimales. También una
     función `aErrorVisible(zodError)` que devuelva el **primer** mensaje.
   - `errores.ts`: la clase `ErrorApp` con `codigo` y `mensaje` (códigos de
     CONTEXTO §6) y un helper que convierta cualquier error desconocido en
     `INTERNO`, con el mensaje "Algo salió mal. Intenta de nuevo." y el detalle
     en `console.error`.
2. **Server functions** en `src/server/gastos.ts`. Todas usan `requerirMiembro()`
   del paso 03 y el cliente del usuario (RLS activo):
   - `obtenerEstado({ mes })` devuelve:
     ```ts
     { miembro, hoy, mes, meses, config: { categorias, tiposPago, miembros }, gastos }
     ```
     - `categorias` y `tiposPago` incluyen `activa`/`activo` y `orden`: la UI
       ofrece solo las activas, pero pinta todas.
     - Cada gasto lleva `id`, `nombre`, `monto`, `fecha`, `categoriaId`,
       `tipoPagoId`, `autorId` y `notas`.
     - Para calcular los meses con gastos no se traen todas las filas: usa una
       vista o RPC `meses_con_gastos()` (agrégala como migración nueva) que
       devuelva `distinct to_char(fecha,'YYYY-MM')`.
     - Orden de los gastos: CONTEXTO §2.2.
   - `agregarGasto(gastoEntrada)`: comprueba que la categoría y el tipo de pago
     existan y estén **activos**, e inserta con `autor_id = miembro.id`.
     Devuelve `obtenerEstado` del mes del gasto.
   - `actualizarGasto({ id, ...gastoEntrada })`: si no existe →
     `NO_ENCONTRADO` "Ese gasto ya no existe."; no toca `autor_id`. Devuelve
     `obtenerEstado` del mes del gasto.
   - `borrarGasto({ id, mes })`: mismo manejo de "no existe". Devuelve
     `obtenerEstado(mes)`.
   - Los errores de Postgres (violación de check o de FK, etc.) se traducen al
     `ErrorApp` que corresponda. El texto crudo nunca llega al cliente.
3. **Serialización de errores:** asegúrate de que el cliente reciba
   `{ codigo, mensaje }` de forma confiable (según cómo la versión actual de
   TanStack Start serializa los errores lanzados) y crea un helper para
   leerlos en el cliente: `leerErrorApp(e)`.
4. **Pruebas** (Vitest):
   - `fechas.ts`: cambio de año, mes inválido, una zona donde el día en UTC
     difiere del de México (por ejemplo 23:30 hora de México) y la lista de
     meses.
   - `validacion.ts`: cada mensaje, el redondeo (`10.005`, `0.004`), espacios y
     notas vacías.
   - Server functions con un Supabase simulado: el autor sale de la sesión
     aunque el cliente mande otro, categoría inactiva rechazada, "Ese gasto ya
     no existe."

## Fuera de alcance

UI (se usa en el paso 05). Por ahora, una ruta temporal de depuración que
muestre `obtenerEstado` como JSON está bien, pero **bórrala** al final del paso.

## Criterios de aceptación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` pasan.
- Con sesión de miembro, las cuatro funciones responden como se espera (verifica
  llamándolas desde la ruta temporal o con una prueba de integración contra la
  base local).
- Sin sesión, responden con el código `NO_AUTENTICADO`; con un usuario que no es
  miembro, con `NO_AUTORIZADO`.
- No queda ninguna ruta de depuración.

## Pasos manuales del usuario

Ninguno.

## Al terminar

Actualiza la bitácora (paso 04 y la forma exacta en que se serializan los
errores, porque los pasos siguientes dependen de eso). Resume y **detente**.
