# Despliegue en Vercel + Supabase de producción

Todos los comandos se corren desde `app/` (PowerShell). Checklist corto: [../CHECKLIST-MANUAL.md](../CHECKLIST-MANUAL.md).

**Cómo está armado el build:** `vite.config.ts` usa el plugin `nitro/vite` (lo que Vercel pide para TanStack Start). En Vercel, Nitro genera `.vercel/output` (funciones + estáticos) y Vercel detecta el framework solo: no hay que tocar el comando de build. Node se fija en `24.x` (`engines` en `package.json`). Las cabeceras de seguridad, la CSP y el `no-cache` de `sw.js` y del manifest están en `routeRules` de ese mismo archivo (Nitro las traduce a la configuración de Vercel); ya no hay `vercel.json`.

## 1. Proyecto de Supabase de producción

supabase.com → New project. Nombre `gastos-prod`, región cercana (`us-east-1`). Guarda la **contraseña de la base** en tu gestor de contraseñas. Anota el *Project ref* (Project Settings → General) y, en Project Settings → API, la URL y la anon/publishable key.

## 2. Esquema y seed

```powershell
supabase link --project-ref <ref>
supabase db push
supabase db query --linked -f supabase/seed.sql
```

`supabase link` pedirá la contraseña de la base. Ojo: `link` cambia el proyecto enlazado; `pnpm db:*` y `pnpm e2e` quedarían apuntando a producción en tu CLI, pero `pnpm e2e` usa `app/.env` (desarrollo). Para volver a desarrollo: `supabase link --project-ref <ref-dev>`.

## 3. Primer admin

Supabase → SQL Editor:

```sql
insert into public.miembros (correo, nombre, es_admin)
values (lower('tu@correo.com'), 'Tu nombre', true);
```

El miembro se vincula a tu usuario en el primer login con Google.

## 4. Google Cloud Console

1. APIs y servicios → Pantalla de consentimiento de OAuth → tipo **Externo**, estado **Prueba**; scopes `openid`, `email`, `profile`.
2. Usuarios de prueba: agrega el correo de cada miembro del hogar.
3. Credenciales → Crear ID de cliente de OAuth → **Aplicación web**. URI de redirección autorizado: `https://<ref>.supabase.co/auth/v1/callback`. Copia Client ID y Client secret.

## 5. Proveedores de auth

Supabase → Authentication → Providers:

- **Google**: habilítalo y pega Client ID y secret.
- **Email**: **desactívalo**. Se usó con contraseña solo para las pruebas E2E en desarrollo; en producción nadie debe poder entrar así.

## 6. Proyecto en Vercel

vercel.com → Add New → Project → importa el repo. **Root Directory: `app`**. Framework: lo detecta (TanStack Start/Nitro); no cambies build ni output. (Alternativa: `vercel link` dentro de `app/`.)

## 7. Variables de entorno

Project Settings → Environment Variables (Production):

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de **producción** |
| `VITE_SUPABASE_ANON_KEY` | anon/publishable key de producción |
| `GEMINI_API_KEY` | tu llave de Gemini |
| `GEMINI_MODELO` | opcional (`gemini-3.5-flash-lite` por omisión) |
| `HOGAR_ZONA_HORARIA` | `America/Mexico_City` |

**Nunca** `SUPABASE_SERVICE_ROLE_KEY` ni las credenciales de Google en Vercel. Las `VITE_*` se incrustan en el build: si las cambias, vuelve a desplegar.

## 8. Deploy

Deploy desde el panel (o `vercel --prod`). Copia la URL de producción.

## 9. URLs de auth

Supabase → Authentication → URL Configuration: **Site URL** = `https://<dominio>`; en **Redirect URLs** agrega `https://<dominio>/auth/callback`.

## 10. Verificar

```powershell
pnpm verificar:prod https://<dominio>
```

Comprueba: `/` → `/login`, manifest con content-type correcto, `sw.js` con `no-cache`, íconos y que `/login` cargue sin errores de consola (incluida la CSP). Con una URL local (`pnpm build; pnpm start`, puerto 4173) omite las dos comprobaciones de cabeceras de archivos estáticos, porque `vite preview` no las aplica.

Si `sw.js` sale sin `no-cache` en Vercel, las cabeceras de `routeRules` no llegaron a los estáticos: pásalas a un `vercel.json` (`headers`).

## 11. Migrar datos

Ver `migracion/LEEME.md`. Primero sin `--aplicar` (dry-run):

```powershell
pnpm migrar --destino=prod --admin=tu@correo
```

Usa un `.env` temporal con la URL y la service role **de producción** (no la subas ni la pongas en Vercel) y bórralo al terminar.

## 12. Instalar en los teléfonos

Android (Chrome): menú → **Instalar app**. iPhone (Safari): Compartir → **Agregar a inicio**. Cada persona debe entrar con un correo dado de alta en Ajustes.

## 13. Publicar en Google (opcional)

En modo Prueba solo entran los usuarios de prueba (hasta 100). Si hará falta más gente: pantalla de consentimiento → **Publicar aplicación**. Con solo scopes básicos no requiere verificación.

## Notas

- La CSP usa `'unsafe-inline'` en scripts porque TanStack Start inyecta scripts en línea para hidratar. Endurecerla con nonces es posible, pero no se hizo.
- Las migraciones no se probaron en una base vacía local (sin Docker); el primer `db push` a producción es esa prueba. Si falla, corrige y repite: el proyecto está vacío.
