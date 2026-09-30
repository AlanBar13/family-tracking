# Paso 03 — Autenticación con Google (Supabase Auth)

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (§1, §5 y §6) y confirma en la bitácora que el paso 02
  está ✅.
- Consulta la documentación actual de:
  - Supabase: "Server-Side Auth" con `@supabase/ssr` y "Login with Google";
  - TanStack Start: cookies en el servidor, `beforeLoad` y redirecciones, y
    server functions y middleware.

## Objetivo

Que solo los miembros activos puedan entrar, con el botón "Entrar con Google",
la sesión en cookies y protección en el servidor, no solo en la UI.

## Tareas

1. Instala `@supabase/supabase-js` y `@supabase/ssr`.
2. Crea `src/lib/supabase/servidor.ts`: un cliente por petición con
   `createServerClient`, que lea y escriba las cookies con las utilidades de
   servidor de TanStack Start. Crea también `src/lib/supabase/navegador.ts`, con
   `createBrowserClient` en singleton. Los dos se tipan con `Database`.
3. Crea un middleware o helper de servidor, `requerirMiembro()`, que:
   - obtenga el usuario verificado con `auth.getUser()` (o el método que la
     documentación actual recomiende para validar el JWT en el servidor);
   - si no hay usuario, lance un error con código `NO_AUTENTICADO`;
   - llame a `vincular_miembro()` y cargue el miembro activo por correo;
   - si no hay miembro activo, lance `NO_AUTORIZADO` con el mensaje de CONTEXTO
     §5;
   - devuelva `{ supabase, usuario, miembro }`.

   Todas las server functions futuras lo usarán.
4. Rutas:
   - `/login`: pantalla con el nombre de la app, una línea de descripción y el
     botón "Entrar con Google". Llama a `signInWithOAuth({ provider: 'google',
     options: { redirectTo: <origen>/auth/callback } })`. Si llega
     `?error=no_autorizado` o `?error=sesion`, muestra el mensaje entendible
     que corresponda.
   - `/auth/callback`: intercambia el `code` por la sesión (PKCE) en el
     servidor y redirige a `/`. Si falla, redirige a `/login?error=sesion`.
   - Un layout protegido (por ejemplo `_app`) cuyo `beforeLoad` llama a una
     server function `obtenerSesion()`:
     - sin usuario → redirige a `/login`;
     - usuario que no es miembro → cierra la sesión y redirige a
       `/login?error=no_autorizado&correo=…`;
     - miembro → deja pasar y pone `miembro` en el contexto de la ruta.
   - Mueve el esqueleto del paso 01 dentro de ese layout.
5. En el encabezado del layout protegido, muestra `Capturando como <nombre>` y
   un botón "Salir" que cierra la sesión (servidor y cliente) y vuelve a
   `/login`.
6. En `supabase/config.toml` (local) habilita el proveedor de Google leyendo el
   client id y el secret desde variables de entorno. Agrega esas variables a
   `.env.example` (con el prefijo que pida la CLI, por ejemplo
   `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`), y agrega
   `http://localhost:3000/auth/callback` (o el puerto real) a las URLs de
   redirect permitidas.
7. Prueba unitaria de la lógica de `requerirMiembro()` con el cliente de
   Supabase simulado: sin usuario, no miembro, miembro inactivo y miembro
   activo.

## Fuera de alcance

Datos de gastos, UI del resumen y PWA.

## Criterios de aceptación

- `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` pasan.
- En el navegador:
  - entrar a `/` sin sesión redirige a `/login`;
  - el login con una cuenta de Google que es miembro entra y muestra
    "Capturando como …";
  - con una cuenta que no es miembro, vuelves a `/login` con el mensaje claro;
  - "Salir" funciona;
  - recargar la página mantiene la sesión.
- No hay llaves en el código; la cookie de sesión la maneja `@supabase/ssr`.

## Pasos manuales del usuario

Antes de probar hay que dar de alta el login de Google. Estos pasos van en el
resumen final, breves:

1. En Google Cloud Console, crea un proyecto y configura la pantalla de
   consentimiento (tipo **Externo**, modo **Prueba**, scopes `openid`, `email`
   y `profile`, y agrega los correos de los miembros como **usuarios de
   prueba**).
2. En Credenciales, crea un **ID de cliente de OAuth** de tipo "Aplicación web"
   con:
   - origen autorizado: `http://localhost:3000`;
   - URI de redirección: la *callback URL* que muestra Supabase (en local,
     `http://127.0.0.1:54321/auth/v1/callback`; en la nube,
     `https://<ref>.supabase.co/auth/v1/callback`).
3. Pon el client id y el secret en `.env` (local) o en Supabase → Authentication →
   Providers → Google (nube).

Nota: con Supabase, la sesión la renueva Supabase con su propio refresh token.
El modo "Prueba" de Google no obliga a volver a iniciar sesión cada hora.

## Al terminar

Actualiza la bitácora (paso 03, puerto usado y cualquier diferencia con la
documentación). Resume, lista los pasos manuales pendientes y **detente**.
