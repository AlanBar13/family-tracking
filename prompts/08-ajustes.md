# Paso 08 — Ajustes: categorías, tipos de pago y miembros

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§4, §4.1 y §5) y confirma en la bitácora que el paso 06
  está ✅. El paso 07 no es requisito.
- En la versión anterior esto se hacía editando la hoja `Config` a mano. Ahora
  es una pantalla de la app.

## Objetivo

Una ruta `/ajustes` para que un admin administre las categorías, los tipos de
pago y los miembros, sin tocar SQL. Los miembros que no son admin la ven en
modo de solo lectura.

## Tareas

1. **Server functions** en `src/server/ajustes.ts`. Todas usan
   `requerirMiembro()`; las que escriben exigen `miembro.es_admin` (si no, lanzan
   `NO_AUTORIZADO`: "Solo un administrador puede cambiar los ajustes."):
   - `obtenerAjustes()`: devuelve las categorías, los tipos de pago y los
     miembros, cada uno con su **número de gastos**, para saber si se puede
     borrar.
   - Para categorías y tipos de pago:
     - **crear**: nombre recortado y único sin importar mayúsculas; si ya
       existe, "Ya existe una categoría con ese nombre.";
     - **renombrar**: con la misma validación;
     - **reordenar**: recibe la lista de ids en el orden nuevo;
     - **desactivar/activar**;
     - **borrar**: solo si tiene 0 gastos. Si tiene gastos, "Esta categoría
       tiene gastos. Desactívala en lugar de borrarla.";
     - no se puede dejar el hogar sin **ninguna** categoría activa ni sin
       ningún tipo de pago activo.
   - Para miembros:
     - **agregar** (correo validado y en minúsculas, y nombre);
     - **cambiar nombre**;
     - **activar/desactivar**;
     - **hacer/quitar admin**.
     - Reglas: no se puede desactivar ni quitarle el admin al **último admin
       activo**; un admin no puede desactivarse a sí mismo; un miembro con
       gastos no se borra, se desactiva.
2. **UI** en `/ajustes`, con enlace desde el encabezado (ícono de engrane):
   - tres secciones con listas simples;
   - agregar con un campo y un botón;
   - renombrar en línea;
   - interruptor de activo;
   - reordenar con botones ↑ ↓ (no hace falta drag and drop);
   - borrar con confirmación, solo visible cuando se permite;
   - los que no son admin ven todo deshabilitado, con la nota "Solo un
     administrador puede cambiar esto.";
   - los errores de servidor se muestran junto a la sección, con su mensaje
     entendible.
3. Asegúrate de que el formulario de gastos (paso 06), el resumen (paso 05) y el
   lector de tickets (paso 07, si ya existe) respeten `orden` y `activa`/`activo`
   con los datos nuevos: las inactivas no se ofrecen, pero siguen pintándose en
   los gastos viejos.
4. Explica en la pantalla, con un texto corto, que un miembro nuevo también debe
   estar como **usuario de prueba** en Google Cloud Console mientras la app esté
   en modo "Prueba".

## Fuera de alcance

Colores personalizados por categoría, varios hogares e invitaciones por correo.

## Criterios de aceptación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` pasan, con pruebas
  de las reglas: último admin, borrar con gastos, nombre duplicado y dejar el
  hogar sin categorías activas.
- Se prueba en el navegador con un admin y con un miembro que no es admin. Las
  escrituras del que no es admin también fallan **directo en la base** (RLS),
  no solo en la UI: verifícalo llamando a Supabase con su sesión.
- Un miembro desactivado ya no puede entrar: en su siguiente petición se le
  redirige a `/login` con el mensaje de "no tiene acceso".

## Pasos manuales del usuario

Ninguno, fuera de agregar a los miembros nuevos como usuarios de prueba en
Google Cloud Console.

## Al terminar

Actualiza la bitácora. Resume y **detente**.
