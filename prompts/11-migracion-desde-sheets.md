# Paso 11 — Migración de datos desde Google Sheets

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§2.4 y §4) y confirma en la bitácora que el paso 04
  está ✅.
- Lee `Codigo.gs` (en la raíz): `ENCABEZADOS_GASTOS`, `ENCABEZADOS_CONFIG`,
  `COL`, `leerConfig_` y `leerGastos_`, para conocer el formato exacto de las
  hojas.

## Objetivo

Un script repetible que importe a Supabase los gastos y la configuración del
Google Sheet anterior a partir de CSV exportados, con modo de prueba y reporte.

## Formato de entrada

El usuario exporta cada hoja con **Archivo → Descargar → CSV** y los guarda en
`app/migracion/` (carpeta **ignorada por git**, porque tiene datos personales):

- `Gastos.csv`, con las columnas `ID, Nombre del gasto, Monto, Fecha,
  Categoría, Quién lo subió, Tipo de pago, Notas`:
  - el ID es un UUID de `Utilities.getUuid()`;
  - el monto puede venir como `$1,234.50`;
  - la fecha puede venir como `2026-03-02` o en formato local.
- `Config.csv`, con las columnas `Categorías, Tipos de pago, Correo, Nombre`.
  Son listas independientes por columna y pueden tener celdas vacías.

## Tareas

1. Agrega `app/migracion/` al `.gitignore` y crea `app/migracion/LEEME.md`
   (este sí se versiona; ajusta el ignore con una excepción) con las
   instrucciones de exportación.
2. Crea `scripts/migrar-desde-sheets.ts`, que se ejecuta con `tsx` desde el
   script `pnpm migrar` en `package.json`:
   - usa `SUPABASE_SERVICE_ROLE_KEY` (o la secret key) y `VITE_SUPABASE_URL`
     desde `.env`. Si faltan, un error claro. **Es el único lugar** donde se
     usa esa llave;
   - lee los CSV con un parser real (`csv-parse` o similar), sin `split(',')`;
   - **sin argumentos es dry-run**: no escribe nada y solo reporta. Con
     `--aplicar`, escribe. Con `--destino=dev|prod`, se exige confirmar
     escribiendo el nombre del destino, para evitar accidentes.
3. **Reglas de importación:**
   - **Categorías y tipos de pago:**
     - los de `Config.csv` se crean activos, respetando el orden;
     - los nombres que aparecen en `Gastos.csv` pero ya no están en Config se
       crean **inactivos**;
     - si ya existe uno con el mismo nombre (comparando sin mayúsculas), se
       reutiliza.
   - **Miembros:**
     - los de `Config.csv` se crean activos, con el correo en minúsculas y, si
       falta el nombre, la parte antes de la `@`;
     - los correos que aparecen como autor pero no están en Config se crean
       **inactivos**;
     - ninguno se crea como admin, salvo el que se pase con `--admin=correo`;
     - `user_id` queda nulo y se vincula en el primer login.
   - **Gastos:**
     - se conserva el **mismo `id`**, con upsert por id, así que correr el
       script dos veces no duplica;
     - monto: se quitan `$`, `,` y espacios, y se redondea a 2 decimales;
     - fecha: se normaliza a `yyyy-MM-dd`;
     - las filas sin ID se ignoran, como en `leerGastos_`.
   - Una fila inválida (monto ≤ 0, fecha ilegible, nombre vacío) **no** detiene
     todo: se reporta con su número de fila y el motivo.
   - Las inserciones van en lotes (por ejemplo de 500) y los mensajes de
     progreso son claros.
4. **Reporte final** (en consola y en `migracion/reporte-<fecha>.md`):
   - cuántas categorías, tipos de pago, miembros y gastos se crearon, se
     reutilizaron o se omitieron;
   - la lista de filas omitidas con su motivo;
   - el total de montos por mes en el CSV contra el total en la base después de
     importar. Deben coincidir.
5. **Pruebas** de la lógica de parseo (montos con formato, fechas en varios
   formatos, filas vacías, autor desconocido) con CSV de ejemplo **inventados**
   en `scripts/__fixtures__/`.

## Fuera de alcance

Leer el Sheet directamente con la API de Google (se usan CSV a propósito) y
borrar datos del Sheet.

## Criterios de aceptación

- `pnpm test` pasa, incluidas las pruebas del parseo.
- El dry-run sobre los fixtures muestra el reporte correcto.
- `--aplicar` sobre la base de **desarrollo** importa los fixtures. Una segunda
  ejecución no duplica nada, y los totales por mes coinciden.
- `git status` no muestra ningún CSV ni reporte con datos.

## Pasos manuales del usuario

1. Exportar las hojas `Gastos` y `Config` a CSV y copiarlas en
   `app/migracion/`.
2. Correr primero el dry-run, revisar el reporte y después usar `--aplicar`. En
   producción, hacerlo **después** del paso 12, con `--destino=prod
   --admin=tu@correo`.

## Al terminar

Actualiza la bitácora. Resume y **detente**.
