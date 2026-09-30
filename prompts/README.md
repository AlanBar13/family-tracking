# Prompts para construir Gastos de la casa v2

Con estos prompts se construye la app nueva (TanStack Start + Supabase + Vercel),
**un paso a la vez**. Cada prompt es una sesión de trabajo con un agente de
código, como Claude Code.

## Cómo usarlos

1. Abre una **sesión nueva** para cada paso. Así el contexto llega limpio: todo
   lo que hace falta está en `CONTEXTO.md` y en el código que ya existe.
2. Dile al agente:
   > Lee `prompts/CONTEXTO.md` y ejecuta `prompts/01-proyecto-base.md`.
3. Cuando termine, **revisa** antes de seguir:
   - que los criterios de aceptación del prompt se cumplan (el agente debe
     reportarlos);
   - que la bitácora de `CONTEXTO.md` esté actualizada;
   - que hayas hecho los **pasos manuales** del prompt (crear cuentas, pegar
     llaves, etc.).
4. Si algo quedó mal, corrígelo en la misma sesión. No pases al siguiente
   paso con pendientes.
5. Haz commit tú mismo cuando estés conforme. Los prompts no hacen commit.

## Orden

| # | Archivo | Resultado |
|---|---|---|
| 01 | `01-proyecto-base.md` | Proyecto que arranca en local, con estilos y estructura |
| 02 | `02-base-de-datos.md` | Tablas, RLS y seed en Supabase |
| 03 | `03-autenticacion.md` | Login con Google y acceso solo para miembros |
| 04 | `04-server-functions.md` | API de gastos validada y con pruebas |
| 05 | `05-resumen-y-lista.md` | Resumen del mes y lista por día |
| 06 | `06-formulario-gastos.md` | Alta, edición y borrado |
| 07 | `07-lector-de-tickets.md` | Escanear el ticket con Gemini |
| 08 | `08-ajustes.md` | Categorías, tipos de pago y miembros |
| 09 | `09-pwa.md` | App instalable |
| 10 | `10-errores-y-pruebas.md` | Estados de error pulidos y pruebas E2E |
| 11 | `11-migracion-desde-sheets.md` | Importar los datos del Google Sheet |
| 12 | `12-despliegue.md` | Producción en Vercel y `CHECKLIST-MANUAL.md` |

Los pasos 07 y 08 son independientes entre sí. El 11 se puede correr en
cualquier momento después del 04.

## Si cambias de opinión a mitad del camino

Edita `CONTEXTO.md` primero (sección de decisiones) y después sigue con el
siguiente prompt. Los prompts se apoyan en ese archivo, así que el cambio se
propaga solo.
