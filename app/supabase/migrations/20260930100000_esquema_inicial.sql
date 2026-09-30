-- Esquema inicial: un solo hogar por instalación (CONTEXTO §4).

create table public.miembros (
  id         uuid primary key default gen_random_uuid(),
  correo     text not null unique check (correo = lower(correo)),
  nombre     text not null,
  user_id    uuid unique references auth.users (id) on delete set null,
  es_admin   boolean not null default false,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categorias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  orden      int not null default 0,
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tipos_pago (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  orden      int not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gastos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (char_length(nombre) between 1 and 120),
  monto        numeric(12, 2) not null check (monto > 0),
  fecha        date not null,
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  tipo_pago_id uuid not null references public.tipos_pago (id) on delete restrict,
  autor_id     uuid not null references public.miembros (id) on delete restrict,
  notas        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index gastos_fecha_idx on public.gastos (fecha desc);
-- Índices de apoyo para las llaves foráneas (borrado restringido y desgloses).
create index gastos_categoria_idx on public.gastos (categoria_id);
create index gastos_tipo_pago_idx on public.gastos (tipo_pago_id);
create index gastos_autor_idx on public.gastos (autor_id);

-- updated_at automático en gastos.
create function public.gastos_actualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gastos_updated_at
  before update on public.gastos
  for each row execute function public.gastos_actualizar_updated_at();

-- El autor de un gasto no cambia nunca.
create function public.gastos_bloquear_cambio_autor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.autor_id is distinct from old.autor_id then
    raise exception 'No se puede cambiar el autor de un gasto.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger gastos_autor_inmutable
  before update on public.gastos
  for each row execute function public.gastos_bloquear_cambio_autor();

-- El correo de un miembro siempre se guarda en minúsculas y sin espacios.
-- Corre antes de validar el check, así "Ana@Gmail.com" se normaliza.
create function public.miembros_normalizar_correo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.correo = lower(btrim(new.correo));
  return new;
end;
$$;

create trigger miembros_correo_minusculas
  before insert or update of correo on public.miembros
  for each row execute function public.miembros_normalizar_correo();
