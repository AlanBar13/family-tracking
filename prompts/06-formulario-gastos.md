# Paso 06 — Alta, edición y borrado de gastos

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§2.1 y §2.2) y confirma en la bitácora que el paso 05
  está ✅.
- Lee `Index.html` (en la raíz): `abrirPanel`, `cerrarPanel`, `guardar`,
  `borrar`, `bloquear`, `errorForma` y `elegirPago`, y el HTML de
  `#panel`.

## Objetivo

El formulario de gasto en un panel de pantalla completa en el celular (o un
diálogo en escritorio), para crear, editar y borrar, sin perder lo capturado si
algo falla.

## Tareas

1. **Panel:**
   - Se abre con `?nuevo=1` o con `?editar=<id>`, así que el botón "atrás" del
     celular lo cierra.
   - Título: "Nuevo gasto" o "Editar gasto".
   - Maneja el foco correctamente: al abrir para crear, el foco va al monto; al
     cerrar, regresa al botón que lo abrió.
   - Mientras está abierto, el fondo no hace scroll.
   - Tiene `aria-modal` y se cierra con Escape.
2. **Campos, en este orden:**
   - espacio reservado para el botón "Escanear ticket" (paso 07; por ahora un
     slot vacío);
   - **Monto** grande, con `inputmode="decimal"` y placeholder `0.00`;
   - **Nombre del gasto**, con placeholder `Súper de la semana`;
   - **Fecha** (`type="date"`);
   - **Categoría**, un select solo con las activas (si se edita un gasto con
     una categoría inactiva, también se muestra esa, marcada como
     "(inactiva)");
   - **Tipo de pago**, como fichas o botones con `aria-pressed`, con la misma
     regla para los inactivos;
   - **Notas (opcional)**.
3. **Valores iniciales:**
   - Al crear: el monto vacío, la fecha por omisión de CONTEXTO §2.2, la
     primera categoría activa y el primer tipo de pago activo.
   - Al editar: los valores del gasto. Si el id no está en el estado cargado,
     muestra "Ese gasto ya no existe." y cierra.
4. **Guardar:**
   - Primero valida en el cliente con el mismo esquema Zod, más "Elige la fecha
     del gasto.".
   - Llama a `agregarGasto` o a `actualizarGasto`.
   - Mientras guarda, deshabilita los botones y cambia el texto a
     "Guardando…".
   - **Solo si sale bien:** cierra el panel y actualiza la vista con el estado
     que devuelve la función, navegando al mes del gasto.
   - **Si falla:** el panel sigue abierto, los datos se quedan y se muestra el
     mensaje en un aviso arriba del formulario, con `scrollIntoView`.
5. **Borrar** (solo al editar):
   - Hay un botón "Borrar este gasto" con el color de peligro.
   - Pide confirmación con el texto de CONTEXTO §2.1, en un diálogo propio y
     accesible (no `window.confirm`).
   - Luego llama a `borrarGasto({ id, mes })`, con los mismos estados de carga
     y error.
6. **Evitar el doble envío:** ignora clics mientras hay una operación en curso.
7. Mantén las invalidaciones de TanStack Router/Query coherentes, para que el
   resumen, la lista y los meses se actualicen sin recargar la página.

## Fuera de alcance

El lector de tickets (solo queda el slot) y la edición de categorías.

## Criterios de aceptación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` pasan.
- En el navegador (a 390 px):
  - crear un gasto en el mes actual aparece en el resumen y en la lista;
  - crear uno con fecha de otro mes lleva a ese mes;
  - editar el nombre y el monto se refleja;
  - borrar pide confirmación y lo quita;
  - el monto `0`, el nombre vacío y la fecha vacía muestran sus mensajes
    exactos sin llamar al servidor;
  - "atrás" cierra el panel;
  - si el servidor devuelve un error (simula uno, por ejemplo con una
    categoría desactivada mientras el panel está abierto), el mensaje es
    entendible y los datos siguen en el formulario.
- La columna `autor_id` en la base corresponde al usuario que capturó el gasto.

## Pasos manuales del usuario

Ninguno.

## Al terminar

Actualiza la bitácora. Resume y **detente**.
