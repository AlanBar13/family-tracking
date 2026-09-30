# CONTEXTO — Gastos de la casa (v2)

> Todos los prompts de esta carpeta cargan este archivo. Es la fuente de verdad.
> Si algo aquí contradice a un prompt, **gana este archivo**: avisa al usuario y
> anótalo en la bitácora. Si durante un paso se toma una decisión nueva, se
> agrega aquí, no solo en el código.

---

## 1. Producto

App para registrar y ver los gastos de **un hogar** (entre 2 y 5 personas).
Sustituye a una versión anterior hecha con Google Sheets + Apps Script, que
sigue en la raíz del repo **solo como referencia** y no se modifica:

| Archivo legado | Qué sacar de ahí |
|---|---|
| `Codigo.gs` | validaciones, lógica de meses, estructura de los datos |
| `Ticket.gs` | prompt, esquema y posprocesado del lector de tickets |
| `Index.html` | comportamiento de la UI, textos, paleta y tokens de color |

- **Idioma:** español de México (es-MX), en la UI y en los mensajes de error.
- **Moneda:** MXN, con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
- **Zona horaria del hogar:** `America/Mexico_City`. "Hoy" y "mes actual" se
  calculan **siempre** en esa zona, nunca con la del servidor (Vercel corre en UTC).
- **Uso principal:** el celular, instalada como PWA. El escritorio es secundario.

### Funcionalidad (debe existir al final)

1. **Resumen del mes:**
   - total del mes;
   - número de gastos y promedio por gasto;
   - una barra "espectro" con la proporción de cada categoría;
   - desgloses por categoría, por tipo de pago y por persona.
2. **Lista de gastos del mes**, agrupada por día, con edición y borrado.
3. **Alta y edición de gastos:** monto, nombre, fecha, categoría, tipo de pago y
   notas opcionales.
4. **Lector de tickets:** se toma una foto, Gemini propone los campos y la
   persona revisa antes de guardar. La foto nunca se guarda.
5. **Ajustes:** administrar categorías, tipos de pago y miembros del hogar (lo
   que antes se hacía en la hoja `Config`).
6. **PWA** instalable (manifest, service worker e íconos propios).
7. **Login con Google.** Solo entran los correos dados de alta como miembros.

---

## 2. Reglas de negocio (portadas de la versión anterior)

### 2.1 Validación de un gasto (en el servidor, siempre)

Los mensajes exactos están en `app/src/lib/mensajes.ts`, que se crea en el paso 04.

| Regla | Mensaje |
|---|---|
| `nombre` recortado no vacío (máx. 120 caracteres) | `Ponle un nombre al gasto.` |
| `monto` numérico, finito y > 0 | `El monto debe ser mayor a cero.` |
| `fecha` con formato `yyyy-MM-dd` y válida | `La fecha no es válida.` |
| `categoria_id` existe y está activa | `Esa categoría no existe. Revísala en Ajustes.` |
| `tipo_pago_id` existe y está activo | `Ese tipo de pago no existe. Revísalo en Ajustes.` |
| al editar o borrar, el id debe existir | `Ese gasto ya no existe.` |
| `notas` opcional, recortada (máx. 500 caracteres) | — |

- El monto se redondea a 2 decimales: `Math.round(monto * 100) / 100`.
- En el cliente, el monto se limpia con `parseFloat(texto.replace(/[^0-9.]/g, ''))`.
- Validación extra en el cliente, antes de enviar: sin fecha → `Elige la fecha del gasto.`
- **Autor:** es siempre el miembro autenticado y lo pone el servidor; **nunca**
  viene del cliente. Al editar, el autor original no cambia.
- Cualquier miembro puede editar o borrar cualquier gasto del hogar (así funcionaba
  antes).
- Confirmación antes de borrar: `¿Borrar "<nombre>"? No se puede deshacer.`

### 2.2 Meses

- El mes seleccionado tiene formato `yyyy-MM`. Si llega vacío o inválido, se usa
  el **mes actual** (en la zona del hogar).
- La lista de meses disponibles es la unión de los meses que tienen gastos y el
  mes actual, ordenada de forma descendente.
- No se puede navegar a meses futuros: el botón "siguiente" se deshabilita
  cuando `mes >= mesActual`. Hacia atrás no hay límite.
- Los gastos del mes se ordenan por `fecha` descendente. A igual fecha, por
  `created_at` descendente.
- Fecha por omisión al crear un gasto: hoy, si se está viendo el mes actual; si
  no, el día 1 del mes que se está viendo.
- Después de guardar, la vista salta al mes del gasto guardado. Después de
  borrar, se queda en el mes que se estaba viendo.

### 2.3 Resumen

- Total: la suma de los montos del mes. **Todo total, subtotal o promedio se calcula en centavos enteros** con `sumar()`/`aCentavos()` de `src/lib/dinero.ts` (10.50 + 5.50 = 1050 + 550 = 1600 → 16.00); nunca con `+` sobre decimales.
- Pie del total: `N gasto` o `N gastos` según el número, seguido de
  `· promedio $X`. El promedio va **sin decimales** (`maximumFractionDigits: 0`).
- Cada fila del desglose muestra la etiqueta, el monto con 2 decimales y el
  porcentaje entero del total (`monto · pct%`). El ancho de la barra es
  `max(monto / montoMayor * 100, 2)%`. Las filas van ordenadas de mayor a menor.
- Las etiquetas vacías se muestran como `Sin especificar`.
- Colores:
  - **por categoría:** `PALETA[indiceDeLaCategoría % PALETA.length]`, según el
    orden de las categorías;
  - **por tipo de pago:** el color de acento;
  - **por persona:** `PALETA[(i * 4 + 1) % PALETA.length]`, donde `i` es la
    posición de la persona en el desglose.
- Mes sin gastos: `Todavía no hay gastos en este mes.` y
  `Agrega el primero con el botón de abajo.`
- Lista vacía: `Sin movimientos este mes.`
- Encabezado de cada día en la lista: `lunes 3 de marzo` (día de la semana,
  número y mes, en minúsculas).
- Cada gasto de la lista muestra: un punto del color de su categoría, el nombre,
  la línea `categoría · tipo de pago · persona` y el monto.
- El encabezado de la app dice `Capturando como <nombre>`. Si el miembro no
  tiene nombre, se usa la parte del correo antes de la `@`.

```ts
export const PALETA = ['#10716b','#2e5eaa','#c1666b','#e8a33d','#6a7fdb','#4c956c',
  '#9b5de5','#a15c2b','#7a8b99','#d67ba0','#3f8f7a','#b08968'];
```

### 2.4 Valores iniciales (seed)

- **Categorías:** Despensa, Casa, Servicios, Transporte, Salud, Comida fuera,
  Entretenimiento, Ropa, Hijos, Otros.
- **Tipos de pago:** Transferencia, Crédito, Débito, Efectivo.

### 2.5 Lector de tickets

Port de `Ticket.gs`. El prompt y el esquema se copian **textualmente** de ese
archivo. Esto es un resumen:

- **Cliente:**
  - Se reduce la foto para que su lado mayor mida como máximo 1280 px.
  - Se pinta sobre un fondo blanco y se exporta a JPEG con calidad 0.72, en
    base64 sin el prefijo `data:`.
  - Se usa `<input type="file" accept="image/*" capture="environment">`.
- **Servidor:**
  - Límite de tamaño: si `base64.length * 0.75 > 4 MB` →
    `La foto pesa demasiado. Intenta de nuevo con menos acercamiento.`
  - Llamada a `https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent`
    con el header `x-goog-api-key`, `temperature: 0`,
    `responseMimeType: application/json` y `responseSchema` con los campos
    `comercio`, `total`, `fecha`, `categoria`, `tipoPago`, `confianza` y `nota`.
  - Modelo: la variable `GEMINI_MODELO`; si no existe, `gemini-3.5-flash-lite`.
  - `systemInstruction`: el texto de `instruccion_()` de `Ticket.gs`, con la
    fecha de hoy (zona del hogar) y las listas de categorías y tipos de pago
    **activos** del hogar.
- **Posprocesado:**
  - `monto` = total redondeado a 2 decimales.
  - `fecha` se acepta si tiene formato `yyyy-MM-dd`; si no, se usa hoy.
  - `nombre` = comercio, cortado a 60 caracteres.
  - `categoria` y `tipoPago` se resuelven con `empatar()`: comparación sin
    acentos ni mayúsculas; primero coincidencia exacta, luego "contiene"; si
    nada coincide, el primer elemento de la lista.
  - Aviso: si no hay monto → `No pude leer el total. Escríbelo a mano.`; si la
    confianza es `baja` → `La foto se lee mal, revisa bien los datos.`; si el
    modelo mandó `nota`, se usa esa nota; en cualquier otro caso →
    `Revisa los datos antes de guardar`.
- **Errores de Gemini:**
  - 429 → `Gemini está saturado o se acabó la cuota. Intenta en un minuto.`
  - 400 con "API key" en el mensaje → `La clave de Gemini no es válida.`
  - respuesta que no se puede interpretar →
    `No pude interpretar la respuesta del modelo. Captura el gasto a mano.`
  - cualquier otro código → un mensaje genérico entendible; el detalle técnico
    va solo al log.
- **No escribe nada** en la base de datos: solo devuelve una propuesta.

---

## 3. Stack y decisiones

| Tema | Decisión |
|---|---|
| Framework | **TanStack Start** (React + TypeScript) con server functions (`createServerFn`) |
| Estilos | Tailwind CSS v4. Diseño libre, partiendo de los tokens de color de la sección 3.1 |
| Validación | **Zod** en el input de **toda** server function |
| Base de datos y auth | **Supabase** (Postgres + Auth con Google) usando `@supabase/ssr` con cookies |
| IA | API de Gemini, llamada **solo desde el servidor** |
| Pruebas | Vitest (unitarias) + Playwright (E2E) |
| Paquetes | pnpm |
| Despliegue | **Vercel** |
| Sistema del desarrollador | Windows 11, PowerShell. Los comandos deben funcionar ahí |

**Importante:** las APIs de TanStack Start y de Supabase cambian seguido. Antes
de escribir código de un tema, **consulta la documentación actual**
(tanstack.com/start, supabase.com/docs) en lugar de confiar en tu memoria. Si la
API real difiere de lo que dice un prompt, sigue la documentación y anota la
diferencia en la bitácora.

### 3.1 Tokens de color (heredados de `Index.html`)

| Token | Claro | Oscuro |
|---|---|---|
| papel (fondo) | `#eef1f0` | `#131817` |
| tarjeta | `#ffffff` | `#1d2423` |
| tinta (texto) | `#15211e` | `#e8edeb` |
| suave (texto secundario) | `#5e6d68` | `#96a49f` |
| línea (bordes) | `#d9dedc` | `#2c3634` |
| acento | `#10716b` | `#37a89f` |
| peligro | `#a8402c` | `#e08472` |

- Radio de las tarjetas: 14 px.
- Tipografía del sistema.
- Cifras con `font-variant-numeric: tabular-nums`.
- Respetar `env(safe-area-inset-*)`.
- Soporte de modo oscuro con `prefers-color-scheme` y de `prefers-reduced-motion`.

---

## 4. Modelo de datos (Supabase / Postgres)

Hay un solo hogar por instalación, así que no hace falta una tabla de hogares.

```
miembros
  id          uuid pk default gen_random_uuid()
  correo      text not null unique  check (correo = lower(correo))
  nombre      text not null
  user_id     uuid null unique references auth.users(id) on delete set null
  es_admin    boolean not null default false
  activo      boolean not null default true
  created_at  timestamptz not null default now()

categorias
  id uuid pk, nombre text not null unique, orden int not null default 0,
  activa boolean not null default true, created_at timestamptz default now()

tipos_pago
  id uuid pk, nombre text not null unique, orden int not null default 0,
  activo boolean not null default true, created_at timestamptz default now()

gastos
  id            uuid pk default gen_random_uuid()
  nombre        text not null check (char_length(nombre) between 1 and 120)
  monto         numeric(12,2) not null check (monto > 0)
  fecha         date not null
  categoria_id  uuid not null references categorias(id) on delete restrict
  tipo_pago_id  uuid not null references tipos_pago(id) on delete restrict
  autor_id      uuid not null references miembros(id) on delete restrict
  notas         text not null default ''
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()   -- trigger
  índice: (fecha desc)
```

- Las categorías y los tipos de pago **no se borran si están en uso**: se
  desactivan. Los gastos viejos conservan su categoría aunque esté inactiva.
- `miembros.user_id` se vincula en el primer login, cuando coincide el correo.

### 4.1 Seguridad a nivel de filas (RLS)

- RLS **activado en todas las tablas**.
- `es_miembro()`: función `security definer` que devuelve true si existe un
  miembro activo cuyo `correo` coincide con `lower(auth.jwt() ->> 'email')`.
- `es_admin()`: lo mismo, con la condición adicional `es_admin = true`.
- `mi_miembro_id()`: devuelve el `id` del miembro autenticado.
- Permisos por tabla:

| Tabla | Leer | Insertar | Actualizar | Borrar |
|---|---|---|---|---|
| `gastos` | miembro | miembro, con `autor_id = mi_miembro_id()` | miembro, sin poder cambiar `autor_id` (trigger) | miembro |
| `categorias`, `tipos_pago` | miembro | admin | admin | admin |
| `miembros` | miembro | admin | admin | admin |

---

## 5. Seguridad

- **Allowlist:** solo entran los correos de `miembros` con `activo = true`. Un
  usuario autenticado en Google pero que no es miembro ve el mensaje `La cuenta
  <correo> no tiene acceso. Pide que te agreguen en Ajustes.` y su sesión se
  cierra.
- **En el servidor:** para validar el usuario se usa `supabase.auth.getUser()`
  (o lo que la documentación actual recomiende). Nunca se confía en
  `getSession()` sin verificar.
- Las server functions usan el **cliente de Supabase del usuario** (RLS
  aplicado). La `service_role` / secret key **solo** se usa en scripts locales
  (la migración) y **nunca** en el bundle del cliente ni en server functions.
- **Variables de entorno:** solo las que tienen prefijo `VITE_` llegan al
  navegador, y solo pueden ser públicas (URL de Supabase y anon/publishable
  key). `GEMINI_API_KEY` **no** lleva ese prefijo.
- `.env` y `.env.local` quedan fuera de git. `.env.example` sí se sube, con
  todas las variables documentadas y sin valores reales.
- **Service worker:**
  - **nunca** cachea ni intercepta `/_serverFn/*` ni rutas `/auth/*`;
  - tampoco peticiones que no sean GET ni peticiones a otros orígenes
    (`*.supabase.co`, `accounts.google.com`, `generativelanguage.googleapis.com`);
  - **nunca** cachea HTML renderizado en el servidor que traiga datos
    personales.

Variables de entorno esperadas (el detalle va en `app/.env.example`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=          # o la "publishable key" según el panel de Supabase
SUPABASE_SERVICE_ROLE_KEY=       # SOLO scripts locales (migración). Nunca en Vercel.
GEMINI_API_KEY=
GEMINI_MODELO=                   # opcional
HOGAR_ZONA_HORARIA=America/Mexico_City
```

---

## 6. Convenciones

- **Estructura:**
  - `app/` es el proyecto de TanStack Start;
  - `app/supabase/` contiene las migraciones y el seed;
  - `app/src/lib/` contiene la lógica pura y testeable (meses, validación,
    `empatar`, formato de dinero);
  - `app/src/server/` contiene las server functions;
  - `app/src/routes/` contiene las rutas;
  - `app/src/components/` contiene la UI.
- **Nombres:** el dominio va en español (`gasto`, `categoria`, `obtenerEstado`)
  y lo técnico en inglés cuando es convención (`useQuery`, `loader`).
- **Errores:**
  - Las server functions lanzan errores con un `codigo` (`NO_AUTENTICADO`,
    `NO_AUTORIZADO`, `VALIDACION`, `NO_ENCONTRADO`, `EXTERNO`, `INTERNO`) y un
    `mensaje` en español entendible.
  - La UI **nunca** muestra un stack trace, un error de Postgres crudo ni un
    "Failed to fetch".
  - Los detalles técnicos van a `console.error` en el servidor.
- **Lógica pura:** va en `src/lib/` y lleva pruebas de Vitest.
- **Git:** no hacer commit ni push salvo que el usuario lo pida explícitamente.
  Al final de cada paso se deja todo listo en el working directory.
- **Alcance:** cada paso hace **solo** lo que dice su prompt. Si algo del
  siguiente paso hace falta, se deja un `TODO(paso-XX)` y se menciona.

---

## 7. Bitácora de avance

> Cada prompt actualiza esta tabla al terminar. Estados: ⬜ pendiente,
> 🟡 en curso o con pendientes, ✅ terminado y verificado.

| Paso | Estado | Notas y desviaciones |
|---|---|---|
| 01 Proyecto base | ✅ | Versiones: Node 24.12, pnpm 10.27, TanStack Start 1.168 / Router 1.170, React 19.3, Vite 8.3, Tailwind 4.3 (`@tailwindcss/vite`), Vitest 5.0, ESLint 10, **TypeScript 6.0.3**. Proyecto armado a mano según la guía "build from scratch" (el CLI es interactivo). `git init` hecho, sin commit. |
| 02 Base de datos | ✅ | **Entorno: nube** (sin Docker): proyecto `gastos-dev`, enlazado con `supabase link`. Migraciones `20260930100000_esquema_inicial.sql` y `20260930100100_seguridad.sql` aplicadas con `db push`; seed aplicado con `db query -f seed.sql` (`db push` no lo corre en la nube). Pruebas de RLS en `supabase/tests/rls.sql` (SQL plano con ROLLBACK, sin pgTAP), pasan con `pnpm db:test`. Tipos en `src/lib/database.types.ts` (`pnpm db:types`). `typecheck` y `lint` pasan. **Pendiente del usuario:** darse de alta como primer admin. |
| 03 Autenticación | ✅  | Código listo; `typecheck`, `lint`, `test` (7) y `build` pasan. Puerto 3000. **Pendiente del usuario:** crear `app/.env`, dar de alta Google OAuth y probar en navegador (ver pasos manuales). |
| 04 Server functions | ✅ | `typecheck`, `lint`, `test` (29) y `build` pasan. Migración `20260930110000_meses_con_gastos.sql` aplicada (`meses_con_gastos()`, security invoker) y tipos regenerados. Lógica pura en `src/lib/{mensajes,fechas,validacion}.ts`; lógica con cliente inyectado en `src/server/gastos-logica.ts`; server fns en `src/server/gastos.ts` (`obtenerEstado`, `agregarGasto`, `actualizarGasto`, `borrarGasto`). **No verificado contra la base con sesión real** (requiere login manual, paso 03 sigue 🟡); se probó con Supabase simulado. Ruta de depuración creada y borrada. |
| 05 Resumen y lista | ✅ | `typecheck`, `lint`, `test` (40) y `build` pasan. Lógica en `src/lib/resumen.ts`; UI en `components/{Resumen,Lista}.tsx` y `routes/_app/index.tsx`; pestañas y "Nuevo gasto" en `Shell.tsx`. Verificado con Playwright (sesión real, datos demo, 390 px, claro y oscuro): totales, porcentajes, agrupación por día y persona, › deshabilitado en el mes actual y URL con mes y vista. Capturas en `capturas-paso05/`. |
| 06 Formulario | ✅ | `typecheck`, `lint`, `test` (40) y `build` pasan. `components/PanelGasto.tsx` con `<dialog>` nativo (foco, Escape y `aria-modal` gratis; bloqueo de scroll y regreso del foco a mano); confirmación de borrado en otro `<dialog>`. Probado en Playwright a 390 px: validación de fecha vacía, crear, abrir, confirmar y borrar. **No probado a mano:** error de servidor con categoría desactivada, botón atrás, otro mes. Al guardar se navega al mes del gasto y el loader vuelve a pedir el estado (se descarta el que devuelve la server fn). |
| 07 Lector de tickets | ✅ (probado por el usuario con llave real y foto; `probar:gemini` da 200) | `typecheck`, `lint`, `test` (57) y `build` pasan; `GEMINI_API_KEY`/`generativelanguage` no aparecen en `dist/client`. Modelo `gemini-3.5-flash-lite` confirmado vigente (estable) en ai.google.dev el 2026-09-30. Lógica en `lib/ticket.ts` (+ `comprimir-imagen.ts`), llamada a Gemini en `server/ticket-logica.ts` (testeable, `fetch` simulado) y server fn en `server/ticket.ts`; botón en `PanelGasto.tsx`. Prueba de instrucción compara contra `instruccion_()` leyendo `Ticket.gs`. `pnpm probar:gemini` agregado. **No probado en navegador ni con llave real.** Pendiente del usuario: `GEMINI_API_KEY` en `app/.env`. |
| 08 Ajustes | ✅ (probado por el usuario con admin y no admin) | `typecheck`, `lint`, `test` (68) y `build` pasan; `pnpm db:test` (RLS de no admin en categorías, tipos de pago y miembros) pasa. Reglas puras en `lib/ajustes.ts` (+ pruebas: último admin, nombre duplicado, hogar sin activos); lógica en `server/ajustes-logica.ts`, server fns en `server/ajustes.ts`, UI en `components/Ajustes.tsx` y ruta `/ajustes` con engrane en `Shell`. **No probado en navegador** (ni con admin ni con no admin) ni el redirect de un miembro desactivado; "borrar con gastos" solo por lógica, sin pruebas con Supabase simulado. Borrar miembro (pedido por el usuario, no estaba en el prompt): solo con 0 gastos, no a uno mismo ni al último admin; sin prueba del borrado con la base. El paso 3 ya se cumplía: formulario y lector filtran por activo, resumen pinta inactivas. |
| 09 PWA | ✅ (verificado sin sesión) | `typecheck`, `lint` y `build` pasan. Verificado con Playwright sobre `pnpm build` + `pnpm start` (puerto 4173): `Page.getAppManifest` sin errores, `getInstallabilityErrors` vacío, SW `activated` y sin errores de consola; offline, la navegación muestra `/offline.html` y los assets salen del caché; `/_serverFn` no se intercepta. Caché solo con precache + `/assets/*`. Íconos con `pnpm iconos` (`scripts/generar-iconos.ts`, sharp), comprobación de zona segura por píxeles y captura con máscara de círculo y squircle revisada. **No probado:** el flujo con sesión (crear gasto, cambiar de mes) ni el aviso "Hay una versión nueva"; instalar en el teléfono queda para el paso 12. |
| 10 Errores y pruebas | ✅ | `typecheck`, `lint`, `test` (78) y `pnpm e2e` (20 pruebas, ~1 min) pasan. Traducción en `lib/errores-ui.ts` (`traducirError`, `destinoLogin`; una prueba por fila del catálogo); timeouts en `lib/fetch-timeout.ts` + `src/start.ts` (20 s global vía `createStart({ serverFns: { fetch } })`; el ticket pasa su propio `fetch` de 60 s); `FranjaOffline` (en la raíz y dentro del formulario, que es un `<dialog>` y tapa la raíz) y `PantallaError` (`defaultErrorComponent`; el límite raíz usa "Recargar"). E2E en `app/e2e/` contra `pnpm build && pnpm start` (puerto 4173, service worker bloqueado, 1 worker); axe sin violaciones serias/críticas en login, resumen, lista, formulario y ajustes. Capturas en `app/capturas-paso10/`. Búsqueda en `src/`: ningún `.message` crudo llega a la UI (el de Gemini solo va al log). **No probado:** el timeout de 20/60 s en navegador (solo prueba unitaria de `fetchConTimeout`); Gemini real (solo la respuesta de `/_serverFn` simulada). |
| 11 Migración | ⬜ | |
| 12 Despliegue | ⬜ | |

### Decisiones tomadas durante la construcción

_(agregar aquí, con fecha, cualquier decisión que cambie o precise lo anterior)_

- **2026-09-30 (paso 01):**
  - TypeScript se fija en 6.x porque `typescript-eslint` 8.71 no soporta TS 7.
    Revisar cuando salga soporte para TS ≥ 7.1.
  - `resolve.tsconfigPaths: true` en Vite y Vitest resuelve el alias `@/`.
  - Los `theme-color` (claro/oscuro) van como `<meta>` directos en `__root.tsx`,
    porque `head()` de TanStack deduplica metas con el mismo `name`.
  - El script `start` es `vite preview`, provisional. El build genera
    `dist/server/server.js` (sin Nitro); el adaptador real para Vercel se decide
    en el paso 12.
  - Tokens de color como variables CSS en `src/styles.css`, expuestos a Tailwind
    con `@theme inline` (`bg-papel`, `bg-tarjeta`, `text-tinta`, `text-suave`,
    `border-linea`, `bg-acento`, `text-peligro`, `rounded-tarjeta`,
    `shadow-tarjeta`).
- **2026-09-30 (paso 03):**
  - Cookies de sesión con `getCookies`/`setCookie`/`deleteCookie` de `@tanstack/react-start/server`; callback como server route (`server.handlers.GET`).
  - `requerirMiembro()` vive en `src/server/requerir-miembro.ts`, separado de `auth.ts`: si comparte archivo con server functions, el import de `/server` se cuela al bundle del cliente y el build falla (import protection). La lógica testeable es `resolverMiembro(supabase)` en `src/server/miembro.ts`.
  - Errores tipados (`ErrorApp`, códigos) en `src/lib/errores.ts`.
  - Layout protegido `_app` (pathless); el esqueleto se movió de `__root` a ese layout.
  - Entorno nube: los redirect URLs y el proveedor Google también se configuran en el panel de Supabase; `config.toml` solo aplica a `supabase start`.
- **2026-09-30 (paso 04):**
  - **Serialización de errores:** TanStack serializa los errores de server functions con `ShallowErrorPlugin`, que conserva **solo `message`** (se pierden la clase y `codigo`). Por eso toda server function pasa por `ejecutar()`, que lanza `Error('[CODIGO] mensaje')` (`paraCliente`). En el cliente usar siempre `leerErrorApp(e)` (`src/lib/errores.ts`) → `{ codigo, mensaje }`; cualquier otra cosa (p. ej. "Failed to fetch") da `INTERNO`.
  - Entradas inválidas: el `inputValidator` solo tipa; la validación con Zod corre dentro de `ejecutar()` y lanza `VALIDACION` con el primer mensaje (un error lanzado desde el validador no pasa por el mismo camino).
  - `actualizarGasto` permite conservar la categoría/tipo de pago **inactivos que el gasto ya tenía** (si no, no se podrían editar gastos viejos); cualquier otro cambio exige activos.
  - `obtenerEstado.config.miembros` devuelve solo `{ id, nombre }`; `miembro` incluye `esAdmin`.
  - Mensajes nuevos (no estaban en §2.1): nombre >120 y notas >500 caracteres.
  - `Math.round(monto*100)/100` da 10.01 para 10.005 en JS (10.005*100 = 1000.5).
- **2026-09-30 (paso 05):**
  - Estado de la vista en la URL (`?mes=&vista=lista&editar=&nuevo=1`) validado a mano en `validateSearch` (sin `@tanstack/zod-adapter`): lo inválido se descarta; sin `vista` es el resumen y sin `mes` el servidor usa el mes actual.
  - Mientras carga otro mes la vista anterior sigue visible con opacidad reducida (`aria-busy`); no hay `pendingComponent`.
  - `obtenerEstado.config.miembros` ya trae `nombreVisible`, así que el respaldo del correo en `nombreDeMiembro` solo aplica si se le pasa `correo`.
  - `supabase/datos-demo.sql` (`pnpm db:demo`): 2 meses (sep 2026: 6 gastos, $3,155.99, promedio $526; ago 2026: 3 gastos, $6,279.50) y un miembro `demo@example.com`. Se borra repitiendo las dos primeras sentencias.
- **2026-09-30 (paso 08):** las reglas de negocio de Ajustes (último admin, nombre único sin importar mayúsculas, al menos un activo) se validan en el servidor sobre listas completas, no en la base: una carrera entre dos admins podría violarlas. Si importa, pasarlas a triggers. Los conteos de gastos traen todas las filas de `gastos` (`ponytail`).
- **2026-09-30 (paso 09):**
  - **Service worker escrito a mano** (`public/sw.js`), sin `vite-plugin-pwa`: el build de TanStack Start sin Nitro no da una lista de assets que precachear y el SW es chico. `/assets/*` se cachea en tiempo de ejecución (cache-first, nombres con hash); el precache es fijo. Subir `VERSION` invalida todo.
  - Registro y aviso de actualización en `components/ActualizacionPwa.tsx` (solo producción). Solo recarga tras pulsar "Actualizar" (bandera en `sessionStorage`); si recargara en cualquier `controllerchange`, la primera instalación (`clients.claim`) recargaría la página.
  - `app/vercel.json` solo con `Cache-Control: no-cache` para `sw.js` y el manifest; el adaptador de Vercel sigue pendiente (paso 12).
- **2026-09-30 (paso 10):**
  - **Renovación de sesión verificada** (`e2e/sesion.spec.ts`): se inicia sesión por la API, se reescribe la cookie `sb-…-auth-token` con `expires_at` en el pasado (refresh token intacto) y se abre `/`. La página carga sin pasar por el login y las cookies que quedan en el navegador traen otro `access_token` y `expires_at` futuro: `auth.getUser()` en el servidor refresca y `setAll` reescribe las cookies. El cliente de navegador solo se usa para login y cerrar sesión; los datos siempre pasan por el servidor, así que no hay otra renovación que verificar.
  - **E2E y autenticación de prueba:** `e2e/global-setup.ts` crea con la API admin (`SUPABASE_SERVICE_ROLE_KEY`, que debe estar en `app/.env`) tres usuarios de correo y contraseña (`e2e-admin@`, `e2e-miembro@`, `e2e-ajeno@example.com`) y sus filas en `miembros`, inicia sesión por la API y guarda `e2e/.auth/*.json` (ignorado por git); `global-teardown.ts` borra gastos, miembros y cuentas. Corre contra la base de **desarrollo**. **Recordatorio para el paso 12: en producción el proveedor de correo y contraseña debe quedar DESACTIVADO** (Supabase > Authentication > Providers > Email), y `pnpm e2e` no debe apuntar a la base de producción.
  - `error=sesion` en `/login` ahora significa "Tu sesión expiró. Vuelve a entrar."; el fallo del callback de OAuth pasó a `error=fallo` ("No se pudo iniciar sesión…").
  - `_app` sigue con el último miembro validado si `obtenerSesion` falla por red o timeout (`lib/miembro-validado.ts`, módulo aparte porque el code splitting duplica variables del archivo de la ruta); sin esto, cualquier navegación sin red (p. ej. abrir "Nuevo gasto") tumbaba la pantalla.
  - Arreglo menor: la pestaña "Resumen" nunca quedaba `aria-selected` (sin `vista` en la URL).
  - La respuesta simulada del ticket se arma a mano en formato seroval (`e2e/ayudas.ts`); si TanStack cambia el formato de las server functions, esa prueba se rompe.
  - Un timeout no cancela lo que ya hizo el servidor: el mensaje pide confirmar en la lista antes de repetir un guardado.
  - TODO (fuera de alcance): monitoreo externo de errores (Sentry o similar); hoy solo `console.error`.
