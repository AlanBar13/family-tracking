# Paso 10 — Estados de error y pruebas de punta a punta

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§5 y §6) y confirma en la bitácora que los pasos 05,
  06 y 09 están ✅. Si 07 u 08 no están, sus pruebas quedan pendientes y se
  anotan.
- Revisa cómo se manejan hoy los errores en las rutas y el formulario, y busca
  cualquier lugar donde un error crudo pudiera llegar a la UI.

## Objetivo

Que cada situación de falla tenga un mensaje claro y un camino de salida, y
dejar pruebas E2E que protejan los flujos principales.

## Tareas

1. **Catálogo de situaciones.** Cada una lleva mensaje en español y acción
   posible:

   | Situación | Detección | Qué ve la persona |
   |---|---|---|
   | Sin conexión | eventos `online`/`offline` y fallas de red en server functions | una franja fija: "Sin conexión. Lo que captures no se guardará hasta que vuelva el internet."; el formulario no se cierra ni pierde datos |
   | La sesión expiró y no se pudo renovar | `NO_AUTENTICADO` en cualquier llamada | redirección a `/login?error=sesion`: "Tu sesión expiró. Vuelve a entrar." |
   | Ya no es miembro | `NO_AUTORIZADO` | `/login?error=no_autorizado` con su mensaje |
   | Error de validación | `VALIDACION` | el mensaje junto al formulario |
   | Servicio externo (Gemini) | `EXTERNO` | el mensaje en el formulario, sin bloquear la captura manual |
   | Error inesperado o servidor caído | `INTERNO`, 5xx o respuesta no válida | "Algo salió mal. Intenta de nuevo." con un botón "Reintentar" |
   | Ruta inexistente | `notFoundComponent` | página 404 con enlace al inicio |
   | Excepción de render | `errorComponent` / límite de error raíz | una pantalla amable con "Recargar" |

2. Centraliza la traducción en `src/lib/errores-ui.ts`: de un error cualquiera a
   `{ titulo, mensaje, accion }`, con pruebas unitarias para cada fila.
3. **Renovación de sesión:** confirma que `@supabase/ssr` renueva el token solo,
   tanto en el cliente como en el servidor (cookies). Si una server function
   recibe un token vencido pero el refresh token es válido, la petición debe
   seguir sin que la persona lo note. Documenta en la bitácora cómo lo
   verificaste.
4. **Timeouts:** 20 s en las server functions normales y 60 s en el ticket.
   Muestra "Tardó demasiado en responder…" en lugar de dejar la pantalla
   colgada.
5. **E2E con Playwright** (`app/e2e/`):
   - Autenticación de prueba: Google no se puede automatizar. Crea en la base
     de **desarrollo o local** usuarios de prueba con correo y contraseña,
     usando la API admin **solo en el setup de las pruebas**, e inicia sesión
     por la API para guardar el `storageState`. Habilita el proveedor de
     correo y contraseña **solo** en local o desarrollo. Anota en la bitácora
     que en producción debe quedar desactivado.
   - Flujos:
     - login → resumen;
     - crear, editar y borrar un gasto;
     - navegar de mes, sin poder ir al futuro;
     - un usuario que no es miembro ve el mensaje;
     - offline: la franja aparece y el formulario conserva los datos;
     - error de servidor simulado (con `page.route` sobre `/_serverFn`): el
       mensaje es entendible;
     - ajustes: un miembro que no es admin no puede editar (si el paso 08
       existe);
     - el ticket con la respuesta de Gemini simulada (si el paso 07 existe).
   - Script `pnpm e2e`, que usa `pnpm build && pnpm start` o el servidor que
     recomiende la documentación.
6. **Accesibilidad básica:** agrega `@axe-core/playwright` y revisa login,
   resumen, lista, formulario y ajustes, sin violaciones serias ni críticas.

## Fuera de alcance

Monitoreo externo (Sentry, etc.). Deja un `TODO` si lo ves útil.

## Criterios de aceptación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm e2e` pasan.
- Una búsqueda en `src/` confirma que ningún `error.message` crudo de Supabase o
  de `fetch` se pinta directo en la UI.
- Captura de pantalla de la franja offline y de la pantalla de error genérico.

## Pasos manuales del usuario

Ninguno.

## Al terminar

Actualiza la bitácora (paso 10, cómo se verificó la renovación de sesión y el
recordatorio de desactivar el login con contraseña en producción). Resume y
**detente**.
