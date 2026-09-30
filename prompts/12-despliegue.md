# Paso 12 — Despliegue en Vercel y checklist manual

## Antes de empezar

- Lee `prompts/CONTEXTO.md` completo y confirma en la bitácora que los pasos 01 a
  10 están ✅. El 11 es opcional antes del deploy.
- Consulta la documentación actual:
  - desplegar TanStack Start en Vercel (preset o adaptador, `vercel.json`,
    runtime de Node);
  - pasar Supabase a producción: URLs de redirect, Site URL y configuración del
    proveedor de Google.

## Objetivo

Dejar la app lista para producción en Vercel, con un proyecto de Supabase de
producción, y un `CHECKLIST-MANUAL.md` breve con los pasos que solo puede hacer
el usuario.

## Tareas

1. **Configuración del build para Vercel**, según la documentación vigente
   (preset o adaptador, versión de Node). `pnpm build` debe producir la salida
   que Vercel espera. Deja en `vercel.json` los headers del paso 09 (`sw.js` y
   el manifest con `no-cache`) y las cabeceras de seguridad básicas:
   `X-Content-Type-Options`, `Referrer-Policy`,
   `Permissions-Policy: camera=(self)` y una CSP razonable. La CSP debe
   permitir `*.supabase.co` y lo necesario para la cámara. Pruébala en
   `pnpm start` antes de fijarla.
2. **Revisión previa al deploy**, que queda en la bitácora con su resultado:
   - ninguna variable secreta lleva el prefijo `VITE_`;
   - el bundle del cliente no contiene `service_role`, `GEMINI_API_KEY` ni
     `sb_secret`;
   - la configuración de Supabase para producción **no** tiene habilitado el
     login con contraseña (se usó solo para E2E, en el paso 10);
   - las migraciones se aplican limpias en una base vacía;
   - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e` y `pnpm build`
     pasan.
3. Agrega `scripts/verificar-produccion.ts` (`pnpm verificar:prod <url>`), que
   comprueba en la URL desplegada:
   - que `/` redirija a `/login`;
   - que el manifest se sirva con el content-type correcto;
   - que `sw.js` responda con `no-cache`;
   - que los íconos existan;
   - que la CSP no bloquee la carga (con Playwright y los errores de consola
     de la página de login).
4. Escribe **`CHECKLIST-MANUAL.md` en la raíz del repo**: una sola lista
   numerada, en orden, con **una línea por paso** y sin explicaciones largas.
   Las explicaciones van en `app/DESPLIEGUE.md`, que también debes escribir, y
   cada paso del checklist enlaza a su sección. El checklist cubre, en este
   orden:
   1. Crear el proyecto de Supabase de **producción** (región cercana, por
      ejemplo `us-east-1`) y guardar la contraseña de la base.
   2. `supabase link --project-ref <ref>` + `supabase db push` + correr el seed.
   3. Darse de alta como primer admin (el SQL listo para copiar).
   4. Google Cloud Console:
      - pantalla de consentimiento (Externo, en modo Prueba, con los scopes
        `openid`, `email` y `profile`);
      - agregar los correos de los miembros como usuarios de prueba;
      - crear el Client ID web con la redirect URI
        `https://<ref>.supabase.co/auth/v1/callback`.
   5. En Supabase → Auth → Providers → Google: pegar el client id y el secret.
      Desactivar el login con correo y contraseña.
   6. Crear el proyecto en Vercel importando el repo (Root Directory: `app`) o
      con `vercel link`.
   7. Configurar en Vercel las variables de entorno: `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODELO` y
      `HOGAR_ZONA_HORARIA`. **Nunca** la service role.
   8. Hacer el deploy y copiar la URL de producción.
   9. En Supabase → Auth → URL Configuration: Site URL = la URL de producción,
      y en Redirect URLs agregar `https://<dominio>/auth/callback`.
   10. `pnpm verificar:prod https://<dominio>`.
   11. (Opcional) Migrar los datos: `pnpm migrar --destino=prod --admin=tu@correo`
       (primero el dry-run).
   12. Instalar la app en cada teléfono: Android con "Instalar app"; iPhone con
       Compartir → Agregar a inicio.
   13. (Opcional) Publicar la app en Google ("En producción") si se van a
       agregar muchas personas. Con menos de 100 usuarios de prueba no hace
       falta.
5. Actualiza el `README.md` de la raíz: una sección breve "Versión 2 (app/)"
   que explique la arquitectura nueva, diga que los archivos `.gs` y
   `Index.html` quedan como legado y enlace a `CHECKLIST-MANUAL.md` y
   `app/DESPLIEGUE.md`. No borres el contenido existente.

## Fuera de alcance

Hacer el deploy por el usuario, crear cuentas o proyectos, y hacer commit o
push (salvo que el usuario lo pida).

## Criterios de aceptación

- La revisión previa (tarea 2) está completa en la bitácora, sin pendientes.
- `pnpm verificar:prod` funciona contra `pnpm start` en local (con la URL local).
- `CHECKLIST-MANUAL.md` tiene una línea por paso y cabe en una pantalla;
  `app/DESPLIEGUE.md` contiene las explicaciones.
- El resumen final le dice al usuario exactamente qué sigue: "abre
  CHECKLIST-MANUAL.md y empieza por el paso 1".

## Pasos manuales del usuario

Todos los de `CHECKLIST-MANUAL.md`.

## Al terminar

Marca el paso 12 en la bitácora. Anota en "Decisiones" cualquier configuración
de producción que difiera de la documentada. Resume y **detente**.
