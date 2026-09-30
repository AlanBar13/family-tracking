-- Meses (yyyy-MM) que tienen gastos, sin traer todas las filas.
-- security invoker (por omisión): RLS de `gastos` sigue aplicando.
create function public.meses_con_gastos()
returns setof text
language sql
stable
set search_path = ''
as $$
  select distinct to_char(fecha, 'YYYY-MM') from public.gastos;
$$;

revoke execute on function public.meses_con_gastos() from public, anon;
grant execute on function public.meses_con_gastos() to authenticated;
