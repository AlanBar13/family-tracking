# Paso 05 — Resumen del mes y lista de gastos

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§2.2, §2.3 y §3.1) y confirma en la bitácora que el
  paso 04 está ✅, incluida la nota sobre cómo se serializan los errores.
- Lee `Index.html` (en la raíz): `pintarResumen`, `pintarLista`, `barras`,
  `acumular`, `colorCategoria`, `nombreDe` y `moverMes`. Es la referencia del
  comportamiento. El diseño visual puede mejorar, pero la información mostrada
  es la misma.

## Objetivo

La pantalla principal: la navegación por meses, el resumen con sus desgloses y
la lista agrupada por día, con datos reales de `obtenerEstado`.

## Tareas

1. **Estado de la vista en la URL:** `/?mes=2026-09&vista=resumen|lista`,
   validado con el esquema de búsqueda de TanStack Router. Un mes inválido o
   ausente usa el mes actual. El loader de la ruta llama a
   `obtenerEstado({ mes })`.
2. **Lógica pura** en `src/lib/resumen.ts`, con pruebas:
   - `acumular(gastos, clave)`: suma por clave (vacía → `Sin especificar`),
     ordenada de mayor a menor;
   - `porcentaje(monto, total)`: entero;
   - `anchoBarra(monto, mayor)`: `max(monto / mayor * 100, 2)`;
   - `colorCategoria(id, categorias)`: índice según el orden de las categorías
     (incluidas las inactivas), en `PALETA`;
   - `colorPersona(i)`: `(i * 4 + 1) % PALETA.length`;
   - `nombreDeMiembro(id, miembros)`, con la parte del correo antes de la `@`
     como respaldo;
   - `agruparPorDia(gastos)`;
   - `etiquetaDia('2026-03-02')` → `lunes 2 de marzo`;
   - `etiquetaMes('2026-03')` → `Marzo 2026`.
3. **Encabezado:** botones ‹ y › para cambiar de mes, la etiqueta del mes y
   `Capturando como …`. El botón › se deshabilita si `mes >= mesActual`. Cada
   botón tiene su `aria-label`.
4. **Vista Resumen:**
   - el total del mes en grande (números tabulares);
   - el pie `N gasto(s) · promedio $X`;
   - la barra espectro por categoría;
   - tarjetas "Por categoría", "Por tipo de pago" y "Por persona" con filas
     `etiqueta — $monto · pct%` y barra;
   - los colores de CONTEXTO §2.3;
   - el estado vacío con sus dos frases.
5. **Vista Gastos (lista):**
   - encabezados de día;
   - cada gasto como un botón (se abrirá en el paso 06; por ahora puede
     navegar a `?editar=<id>` sin hacer nada más) con el punto de color de la
     categoría, el nombre truncado, la línea `categoría · tipo de pago ·
     persona` y el monto;
   - el estado vacío.
6. **Barra inferior:** las pestañas Resumen y Gastos (`role="tablist"` y
   `aria-selected`) y el botón "Nuevo gasto", que por ahora navega a
   `?nuevo=1` sin más.
7. **Carga:** un esqueleto o indicador discreto al cambiar de mes, y la vista
   anterior visible mientras llega la nueva si el router lo permite. Si el
   loader falla, se muestra el mensaje entendible (`leerErrorApp`) en la
   tarjeta de error. Con `NO_AUTENTICADO` se redirige a `/login`.
8. Esto debe verse bien a 360 px de ancho y en escritorio, en tema claro y
   oscuro.

## Fuera de alcance

El formulario, el borrado, el lector de tickets y los ajustes.

## Criterios de aceptación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` pasan, incluidas
  las pruebas de `resumen.ts`.
- Con datos de prueba (insertados por SQL en la base de desarrollo, con 2
  miembros, varias categorías y 2 meses):
  - los totales, porcentajes y agrupaciones coinciden con un cálculo manual;
  - no se puede avanzar a un mes futuro;
  - la URL refleja el mes y la vista;
  - al recargar, la vista se conserva.
- Capturas de pantalla (móvil, 390 px) del resumen y de la lista, en claro y en
  oscuro, revisadas visualmente.

## Pasos manuales del usuario

Ninguno. Si hace falta, el agente deja un `supabase/datos-demo.sql` (sin
correos reales) para poblar la base de desarrollo.

## Al terminar

Actualiza la bitácora. Resume y **detente**.
