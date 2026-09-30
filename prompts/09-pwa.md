# Paso 09 — PWA instalable

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§3.1 y §5, sobre todo las reglas del service
  worker) y confirma en la bitácora que el paso 06 está ✅.
- Consulta cómo sirve TanStack Start los archivos estáticos (`public/`) y cómo
  se llaman los assets del build (con hash o sin él), para saber qué cachear.
- Decide entre un service worker **escrito a mano** o un plugin (por ejemplo
  `vite-plugin-pwa`). Úsalo solo si funciona bien con TanStack Start y SSR hoy.
  Si hay duda, escríbelo a mano: es pequeño. Anota la decisión.

## Objetivo

Que la app se pueda instalar en Android, iOS y escritorio, abra rápido y se
comporte bien sin conexión, **sin** cachear nunca datos personales ni llamadas
al servidor.

## Tareas

1. **Íconos**, generados por ti (nada de placeholders):
   - Diseño: fondo a sangre del color de acento `#10716b` y, en papel
     `#eef1f0`, un ticket o recibo estilizado (borde inferior dentado, dos o
     tres renglones y una línea de total). Todo el dibujo va **dentro de la
     zona segura maskable**: un círculo centrado con un radio del 40 % del
     lado.
   - Fuente: `public/icons/icon.svg`.
   - Se generan `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180 px)
     y `favicon.svg` o `favicon.ico`, con un script
     `scripts/generar-iconos.ts` que se puede volver a correr. Usa `sharp` si
     instala bien en Windows; si no, rasteriza con Playwright.
   - Comprueba por código que ningún píxel del dibujo cae fuera del círculo
     seguro, y revisa las imágenes visualmente.
2. **`public/manifest.webmanifest`:**
   - `id` y `start_url` `/`, `scope` `/`, `display` `standalone`;
   - `name` "Gastos de la casa", `short_name` "Gastos", `lang` `es-MX`;
   - `background_color` `#eef1f0` y `theme_color` `#10716b`;
   - los íconos 192 y 512 dos veces: una con `purpose: "any"` y otra con
     `purpose: "maskable"`;
   - `shortcuts`: "Nuevo gasto" → `/?nuevo=1`.

   En el layout raíz van el `<link rel="manifest">`, `apple-touch-icon`,
   `apple-mobile-web-app-capable`/`status-bar-style` y `theme-color` con
   variantes claro y oscuro.
3. **Service worker** (`public/sw.js`, o el generado por el plugin):
   - una constante `VERSION`; en `activate` se borran los caches viejos y se
     llama a `clients.claim()`;
   - **precache** de `/offline.html`, los íconos, el manifest y los assets
     estáticos con hash del build (si se escribe a mano: una lista generada en
     el build o cacheo en tiempo de ejecución de `/assets/*` con cache-first);
   - **se ignora por completo** (se retorna sin `respondWith`): lo que no sea
     GET, lo que venga de otro origen, `/_serverFn/*`, `/auth/*`, `/api/*` y
     cualquier petición con el header `Authorization`;
   - **navegaciones** (HTML con SSR): *network-first* sin guardarlas en caché.
     Si no hay red, se sirve `/offline.html`. Así nunca se cachea HTML con
     datos personales;
   - `/offline.html`: una página estática con el estilo de la app que dice "Sin
     conexión. Tus gastos se ven cuando vuelva el internet." y tiene un botón
     "Reintentar".
4. **Registro:**
   - se registra en el cliente, solo en producción (o detrás de una bandera en
     desarrollo), después de `load`;
   - cuando hay un SW nuevo esperando, se muestra un aviso discreto "Hay una
     versión nueva · Actualizar", que manda `SKIP_WAITING` y recarga.
5. En `vercel.json` o en la configuración del framework: `Cache-Control:
   no-cache` para `sw.js` y el manifest, y `Service-Worker-Allowed` si hiciera
   falta.

## Fuera de alcance

Modo offline con datos (cola de gastos sin conexión) y notificaciones push.

## Criterios de aceptación

Verifica de verdad, no a simple vista:

- `pnpm build` + `pnpm start`, y abre la app con Playwright o DevTools.
- Por CDP: `Page.getAppManifest` no reporta errores y
  `Page.getInstallabilityErrors` sale vacío.
- `navigator.serviceWorker.ready` resuelve y la registración queda `activated`,
  sin errores en la consola.
- Después de navegar, crear un gasto y cambiar de mes, **inspecciona
  `caches`**: no hay ninguna entrada de `/_serverFn`, de `/auth`, de otro
  origen ni de HTML de rutas de la app.
- En modo offline (`context.setOffline(true)`), una navegación muestra
  `/offline.html` y los assets cargan desde el caché.
- Los íconos pasan la comprobación de zona segura y se ven bien recortados en
  círculo y en *squircle* (haz una captura con una máscara aplicada).

## Pasos manuales del usuario

Ninguno. Instalar la app en el teléfono se prueba después del deploy (paso 12).

## Al terminar

Actualiza la bitácora (paso 09 y la decisión entre SW manual o plugin). Resume
y **detente**.
