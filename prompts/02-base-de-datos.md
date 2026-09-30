# Paso 02 — Base de datos en Supabase

## Antes de empezar

- Lee `prompts/CONTEXTO.md` (sobre todo §4 y §5) y confirma en la bitácora que el
  paso 01 está ✅.
- Consulta la documentación actual de la Supabase CLI: migraciones, `db push`,
  `gen types` y desarrollo local.

## Objetivo

Crear el esquema completo de CONTEXTO §4, con RLS, triggers, funciones de
ayuda y seed, versionado como migraciones SQL, y generar los tipos TypeScript.

## Tareas

1. Agrega la Supabase CLI como dependencia de desarrollo en `app/` (o usa
   `pnpm dlx supabase`) y corre `supabase init` dentro de `app/`.
2. Decide el entorno de desarrollo:
   - Si **Docker** está disponible, usa Supabase local (`supabase start`).
   - Si no, trabaja contra un proyecto de Supabase **de desarrollo** en la nube
     (`supabase link`) y detente a pedirle al usuario que lo cree (ver pasos
     manuales).
   - Anota la decisión en la bitácora.
3. Crea la migración `…_esquema_inicial.sql` con:
   - las tablas `miembros`, `categorias`, `tipos_pago` y `gastos`, con sus
     columnas, checks, FKs e índices exactamente como en CONTEXTO §4;
   - un trigger `updated_at` en `gastos`;
   - un trigger que impida cambiar `gastos.autor_id` en un UPDATE;
   - un trigger (o check) que mantenga `miembros.correo` en minúsculas.
4. Crea la migración `…_seguridad.sql` con:
   - las funciones `es_miembro()`, `es_admin()` y `mi_miembro_id()`, como
     `security definer`, `stable` y con `set search_path = ''`;
   - `alter table … enable row level security` en las 4 tablas;
   - las políticas de CONTEXTO §4.1, una por operación y con nombres
     descriptivos en español;
   - la función `vincular_miembro()`: si el correo del JWT coincide con un
     miembro activo sin `user_id`, le asigna `auth.uid()`. Se llamará en el
     login (paso 03).
5. Crea `supabase/seed.sql` con las categorías y los tipos de pago de CONTEXTO
   §2.4 (con `orden`). **No** pongas correos reales en el seed: agrega un
   comentario explicando que el primer admin se da de alta a mano.
6. Aplica las migraciones (`supabase db reset` en local, o `supabase db push`
   en la nube).
7. Genera los tipos en `src/lib/database.types.ts` y agrega un script
   `db:types` en `package.json`.
8. Crea el archivo `supabase/tests/rls.sql`, o un script equivalente, que
   compruebe las políticas:
   - un usuario autenticado que no es miembro no ve nada;
   - un miembro ve e inserta gastos solo con su propio `autor_id`;
   - un miembro que no es admin no puede modificar categorías;
   - un admin sí puede.

   Si pgTAP está disponible (`supabase test db`), úsalo.

## Fuera de alcance

Clientes de Supabase en la app, login y UI.

## Criterios de aceptación

- Las migraciones se aplican desde cero sin errores (`supabase db reset` o
  equivalente).
- Las pruebas de RLS pasan, y están incluidos los casos negativos.
- `pnpm typecheck` pasa con los tipos generados.
- Ningún archivo versionado contiene llaves ni correos reales.

## Pasos manuales del usuario

- **Solo si no hay Docker:** crear en supabase.com un proyecto "gastos-dev" y
  pasarle al agente el *project ref* y la contraseña de la base de datos (esta
  va en `.env`, nunca en el chat del repo).
- Después de aplicar las migraciones, darse de alta como primer admin (el
  agente debe dejar el SQL exacto listo para copiar):
  `insert into miembros (correo, nombre, es_admin) values ('tu@gmail.com', 'Tu nombre', true);`

## Al terminar

Actualiza la bitácora (paso 02 y entorno elegido: local o nube). Resume y
**detente**.
