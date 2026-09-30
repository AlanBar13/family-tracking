# Paso 01 — Proyecto base

## Antes de empezar

- Lee `prompts/CONTEXTO.md` completo.
- Lee `Index.html` (en la raíz) para ver los tokens de color y el estilo
  general de la versión anterior.
- Consulta la documentación actual de TanStack Start (tanstack.com/start):
  cómo crear el proyecto, la estructura de rutas y la integración con Vite y
  Tailwind.

## Objetivo

Tener en `app/` un proyecto de TanStack Start que arranque en local, con
TypeScript estricto, Tailwind, lint y formato, y un layout vacío que ya use el
sistema visual. Todavía sin datos ni autenticación.

## Tareas

1. Verifica las herramientas: Node LTS y pnpm (habilítalo con `corepack enable`
   si hace falta). Si falta algo, dile al usuario qué instalar y detente.
2. Crea el proyecto en `app/` con el método oficial vigente de TanStack Start
   (React + TypeScript). Quita las rutas y componentes de ejemplo.
3. Configura TypeScript estricto: `strict`, `noUncheckedIndexedAccess` y el
   alias `@/` apuntando a `src/`.
4. Instala y configura Tailwind CSS v4. Define los tokens de color de
   CONTEXTO §3.1 como variables CSS, con modo claro y modo oscuro por
   `prefers-color-scheme`. Expónlos a Tailwind (`bg-papel`, `text-tinta`,
   `bg-acento`, etc.).
5. Configura ESLint y Prettier de forma sencilla y agrega los scripts `dev`,
   `build`, `start`, `lint`, `typecheck`, `test` y `format`.
6. Instala Vitest con una prueba trivial en `src/lib/` que pase.
7. Crea la estructura de carpetas de CONTEXTO §6: `src/lib`, `src/server`,
   `src/components` y `supabase/`, con un `.gitkeep` donde haga falta.
8. Crea el layout raíz:
   - `lang="es-MX"`;
   - viewport con `viewport-fit=cover`;
   - `theme-color`;
   - título "Gastos de la casa";
   - un esqueleto visual con un encabezado fijo arriba, el contenido centrado
     (máximo 560 px) y una barra inferior fija con espacio para las pestañas
     Resumen y Gastos y el botón "Nuevo gasto";
   - todo sin funcionalidad todavía, respetando `safe-area-inset`.
9. Crea `src/lib/dinero.ts` con los formateadores `dinero` (2 decimales) y
   `dineroCorto` (0 decimales) en es-MX/MXN, y `src/lib/paleta.ts` con `PALETA`.
   Agrega pruebas de ambos.
10. Crea `app/.env.example` con todas las variables de CONTEXTO §5, con un
    comentario por cada una: para qué sirve, de dónde sale y si es pública o
    secreta.
11. Crea el `.gitignore` en la **raíz del repo**. Debe cubrir `node_modules`,
    `.env`, `.env.*` (menos `.env.example`), `.output`, `.vinxi`, `.nitro`,
    `.vercel`, `dist`, `coverage`, `playwright-report`, `test-results`,
    `supabase/.temp` y `supabase/.branches`.
12. Si la raíz todavía no es un repo, corre `git init`. **No hagas commit.**

## Fuera de alcance

- Supabase, auth, server functions reales, PWA y deploy.
- No modifiques `Codigo.gs`, `Ticket.gs`, `Index.html` ni los `.md` de la raíz.

## Criterios de aceptación

- `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`
  terminan sin errores (desde `app/`).
- `pnpm dev` levanta la app; en el navegador se ve el esqueleto sin errores en
  la consola, en tema claro y oscuro.
- `git status` no muestra `.env` ni `node_modules`.

## Pasos manuales del usuario

Ninguno.

## Al terminar

Actualiza la bitácora de `CONTEXTO.md`: paso 01 con su estado y notas
(versiones instaladas y cualquier diferencia con la documentación). Resume lo
que hiciste y **detente**.
