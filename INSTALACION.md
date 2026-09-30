# Instalación

Toma unos 10 minutos. No necesitas saber programar, solo copiar y pegar.

## 1. Crea el archivo de Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja en blanco.
2. Ponle nombre, por ejemplo "Gastos de la casa".

## 2. Pega el código

1. Menú **Extensiones → Apps Script**. Se abre una pestaña nueva.
2. Verás un archivo `Código.gs` ya creado. Borra su contenido y pega el de
   [`Codigo.gs`](./Codigo.gs) de este repositorio.
3. Arriba a la izquierda, junto a "Archivos", da clic en **+ → Script**. Nómbralo
   `Ticket` (sin `.gs`) y pega el contenido de [`Ticket.gs`](./Ticket.gs).
4. Da clic en **+ → HTML**. Nómbralo exactamente `Index` (sin `.html`, o Apps
   Script lo rechaza) y pega el contenido de [`Index.html`](./Index.html).
5. Guarda todo con el ícono del disquete o Ctrl/Cmd+S.

## 3. Crea las hojas y la configuración

1. En la barra de funciones de arriba, elige `instalar` en el menú desplegable
   (donde probablemente diga `doGet`) y da clic en **Ejecutar** (▶).
2. La primera vez pedirá permisos: **Revisar permisos → elige tu cuenta →
   Avanzado → Ir a [nombre del proyecto] (no seguro) → Permitir**. Es tu propio
   script, ese aviso es normal en cualquier Apps Script nuevo.
3. Al terminar sale una ventana de confirmación. Ciérrala.
4. Regresa a la pestaña de Sheets: ya deben existir las hojas **Gastos** y
   **Config**.
5. Abre **Config** y en las columnas **Correo** y **Nombre** reemplaza los dos
   ejemplos por las cuentas de Google reales de las personas que van a capturar
   gastos (dos, tres, las que sean — solo agrega más filas si necesitas más).

Las columnas **Categorías** y **Tipos de pago** también viven ahí. Puedes
agregar, quitar o renombrar libremente; la app los toma de esa hoja.

## 4. (Opcional) Lector de tickets con la cámara

Si quieres el botón de "Escanear ticket" que llena el formulario con una foto,
sigue [`LECTOR-DE-TICKETS.md`](./LECTOR-DE-TICKETS.md). Es opcional: la app
funciona completa sin esto.

## 5. Publica la app web

1. En el editor de Apps Script: **Implementar → Nueva implementación**.
2. En el ícono de engrane junto a "Selecciona el tipo", elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Usuario que accede a la aplicación web
     *(importante — así la app sabe automáticamente quién capturó cada gasto)*
   - **Quién tiene acceso:** Cualquier usuario con cuenta de Google
4. Da clic en **Implementar**, acepta los permisos otra vez y copia la URL que
   te da.

## 6. Compártelo con las demás personas

1. En Sheets, botón **Compartir** (arriba a la derecha) → agrega los correos
   que pusiste en la hoja Config, con permiso de **Editor**. Sin esto no van a
   poder guardar gastos.
2. Mándales la URL de la app web del paso anterior. Al abrirla en el celular
   pueden agregarla a su pantalla de inicio (en iPhone: Compartir → Agregar a
   inicio; en Android: menú del navegador → Agregar a pantalla principal) para
   que se sienta como una app normal.

## Si algo falla

- **"No pude identificar tu cuenta"**: la implementación no quedó en "Ejecutar
  como: Usuario que accede". Vuelve al paso 5 y crea una nueva implementación
  con esa opción.
- **"La cuenta ... no está en la hoja Config"**: falta agregar ese correo en
  Config, columna Correo.
- **Cambiaste el código después de publicar**: los cambios no se ven solos.
  Ve a **Implementar → Administrar implementaciones**, el ícono de lápiz, y en
  Versión elige **Nueva versión**.
