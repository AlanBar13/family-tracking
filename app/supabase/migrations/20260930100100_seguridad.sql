-- Funciones de ayuda, RLS y políticas (CONTEXTO §4.1).

-- security definer: leen `miembros` sin depender de sus propias políticas
-- (evita recursión). search_path vacío: todo va con esquema explícito.
create function public.es_miembro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.miembros m
    where m.activo
      and m.correo = lower(auth.jwt() ->> 'email')
  );
$$;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.miembros m
    where m.activo
      and m.es_admin
      and m.correo = lower(auth.jwt() ->> 'email')
  );
$$;

create function public.mi_miembro_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.miembros m
  where m.activo
    and m.correo = lower(auth.jwt() ->> 'email');
$$;

-- Se llama en el login: si el correo del JWT es de un miembro activo que aún
-- no tiene user_id, se lo asigna. Devuelve el id del miembro o null.
create function public.vincular_miembro()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  update public.miembros m
     set user_id = auth.uid()
   where m.activo
     and m.user_id is null
     and m.correo = lower(auth.jwt() ->> 'email')
  returning m.id into v_id;

  return v_id;
end;
$$;

-- Solo usuarios autenticados pueden llamarlas (nunca anon).
revoke execute on function
  public.es_miembro(), public.es_admin(), public.mi_miembro_id(), public.vincular_miembro()
  from public, anon;
grant execute on function
  public.es_miembro(), public.es_admin(), public.mi_miembro_id(), public.vincular_miembro()
  to authenticated;

alter table public.miembros   enable row level security;
alter table public.categorias enable row level security;
alter table public.tipos_pago enable row level security;
alter table public.gastos     enable row level security;

-- gastos
create policy "Los miembros ven los gastos"
  on public.gastos for select to authenticated
  using (public.es_miembro());

create policy "Los miembros registran gastos propios"
  on public.gastos for insert to authenticated
  with check (public.es_miembro() and autor_id = public.mi_miembro_id());

create policy "Los miembros editan gastos"
  on public.gastos for update to authenticated
  using (public.es_miembro())
  with check (public.es_miembro());

create policy "Los miembros borran gastos"
  on public.gastos for delete to authenticated
  using (public.es_miembro());

-- categorias
create policy "Los miembros ven las categorías"
  on public.categorias for select to authenticated
  using (public.es_miembro());

create policy "Los admins crean categorías"
  on public.categorias for insert to authenticated
  with check (public.es_admin());

create policy "Los admins editan categorías"
  on public.categorias for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "Los admins borran categorías"
  on public.categorias for delete to authenticated
  using (public.es_admin());

-- tipos_pago
create policy "Los miembros ven los tipos de pago"
  on public.tipos_pago for select to authenticated
  using (public.es_miembro());

create policy "Los admins crean tipos de pago"
  on public.tipos_pago for insert to authenticated
  with check (public.es_admin());

create policy "Los admins editan tipos de pago"
  on public.tipos_pago for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "Los admins borran tipos de pago"
  on public.tipos_pago for delete to authenticated
  using (public.es_admin());

-- miembros
create policy "Los miembros ven a los miembros"
  on public.miembros for select to authenticated
  using (public.es_miembro());

create policy "Los admins agregan miembros"
  on public.miembros for insert to authenticated
  with check (public.es_admin());

create policy "Los admins editan miembros"
  on public.miembros for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "Los admins borran miembros"
  on public.miembros for delete to authenticated
  using (public.es_admin());
