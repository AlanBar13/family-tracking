-- Presupuesto mensual opcional por categoría (null = sin presupuesto).
alter table public.categorias
  add column presupuesto numeric(12, 2) check (presupuesto > 0);

-- Suscripciones Web Push: una por dispositivo.
create table public.suscripciones_push (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  miembro_id uuid not null references public.miembros (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index suscripciones_push_miembro_idx on public.suscripciones_push (miembro_id);

alter table public.suscripciones_push enable row level security;

-- Cualquier miembro las lee y borra: el servidor avisa a todos con la sesión de
-- quien captura y limpia las caducadas. Sin la llave VAPID privada no sirven.
create policy "Los miembros ven las suscripciones"
  on public.suscripciones_push for select to authenticated
  using (public.es_miembro());

create policy "Los miembros borran suscripciones"
  on public.suscripciones_push for delete to authenticated
  using (public.es_miembro());

create policy "Los miembros registran su suscripción"
  on public.suscripciones_push for insert to authenticated
  with check (public.es_miembro() and miembro_id = public.mi_miembro_id());

create policy "Los miembros actualizan su suscripción"
  on public.suscripciones_push for update to authenticated
  using (public.es_miembro())
  with check (public.es_miembro() and miembro_id = public.mi_miembro_id());
