# CLAUDE.md

App de gastos del hogar. El código activo está en `app/` (TanStack Start +
React 19 + Supabase, pnpm). Reglas de negocio en `prompts/CONTEXTO.md`.
Los archivos de la raíz (`Codigo.gs`, `Ticket.gs`, `Index.html`) son la
versión legada: solo referencia.

Comandos (en `app/`): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`.

## Orquestación

La sesión principal actúa como orquestador del equipo de subagentes en
`.claude/agents/`:

| Agente | Modelo | Para qué |
|---|---|---|
| `explorador` | haiku | Buscar y leer código (solo lectura) |
| `implementador` | sonnet | Implementar cambios y verificar con lint/tests |
| `revisor-codigo` | haiku | Revisar el `git diff` y reportar problemas |
| `tester` | sonnet | Escribir y correr pruebas de lo nuevo |

Reglas para el orquestador:

- Tú planeas, descompones la tarea y decides qué delegar. No implementas
  cambios grandes directamente (ajustes triviales de una o dos líneas sí).
- Usa `explorador` antes de tocar código que no conozcas.
- Delega la implementación a `implementador`, y luego pasa el resultado por
  `revisor-codigo` y `tester`. Si encuentran problemas, regresa a
  `implementador` con los hallazgos concretos.
- Lanza subagentes en paralelo cuando las tareas sean independientes (p. ej.
  varias exploraciones, o `revisor-codigo` y `tester` sobre el mismo diff).
  Nunca dos `implementador` sobre los mismos archivos a la vez.
- Pídeles resultados breves y verificables (rutas, líneas, comandos y su
  resultado), y verifica lo importante antes de darlo por hecho.
- Al final integra los resultados y resume lo hecho: qué cambió, qué se
  verificó y qué quedó pendiente.
