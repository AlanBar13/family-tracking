# Migración desde Google Sheets

Esta carpeta es para los CSV del Sheet anterior. **Git los ignora** (tienen datos personales); solo este archivo se versiona.

1. En el Sheet, abre la hoja `Gastos` → **Archivo → Descargar → Valores separados por comas (.csv)** y guárdala aquí como `Gastos.csv`.
2. Haz lo mismo con la hoja `Config` → `Config.csv`.
3. Desde `app/`:
   - `pnpm migrar` — prueba (dry-run): no escribe, solo reporta.
   - `pnpm migrar --aplicar --destino=dev` — escribe en desarrollo (pide escribir `dev`).
   - `pnpm migrar --aplicar --destino=prod --admin=tu@correo` — producción (después del paso 12).

Es repetible: los gastos conservan su ID, así que correrlo dos veces no duplica. El reporte queda en `migracion/reporte-<fecha>.md`.
