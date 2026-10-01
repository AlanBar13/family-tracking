-- Pruebas de RLS, sin pgTAP (no requiere Docker).
--
-- Cómo correrlas: pega TODO este archivo en el editor SQL del proyecto de
-- desarrollo (Supabase Dashboard > SQL Editor) y ejecútalo. O con la CLI:
--   pnpm exec supabase db query --linked -f supabase/tests/rls.sql
--
-- Todo corre dentro de una transacción que termina en ROLLBACK: no deja datos.
-- Si una prueba falla, lanza una excepción con el nombre de la prueba.
-- Si todas pasan, verás los avisos "OK: ..." y el mensaje final "RLS: todo bien".

begin;

create schema test_rls;
grant usage on schema test_rls to authenticated;
alter default privileges in schema test_rls grant execute on functions to authenticated;

-- Simula a un usuario autenticado con el correo dado (sin correo = anon).
create function test_rls.como(p_correo text) returns void
language plpgsql as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', gen_random_uuid()::text,
      'role', 'authenticated',
      'email', p_correo
    )::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create function test_rls.volver() returns void
language plpgsql as $$
begin
  execute 'reset role';
end;
$$;

create function test_rls.afirmar(p_ok boolean, p_nombre text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FALLÓ: %', p_nombre;
  end if;
  raise notice 'OK: %', p_nombre;
end;
$$;

do $$
declare
  v_admin uuid;
  v_ana   uuid;
  v_cat   uuid;
  v_tipo  uuid;
  v_gasto uuid;
  v_n     int;
  v_ok    boolean;
begin
  -- Datos de prueba (como postgres, que se salta RLS).
  insert into public.miembros (correo, nombre, es_admin)
    values ('admin@prueba.test', 'Admin', true) returning id into v_admin;
  insert into public.miembros (correo, nombre, es_admin)
    values ('Ana@Prueba.Test', 'Ana', false) returning id into v_ana;
  insert into public.categorias (nombre, orden) values ('Cat de prueba', 999)
    returning id into v_cat;
  insert into public.tipos_pago (nombre, orden) values ('Pago de prueba', 999)
    returning id into v_tipo;
  insert into public.gastos (nombre, monto, fecha, categoria_id, tipo_pago_id, autor_id)
    values ('Gasto del admin', 10, current_date, v_cat, v_tipo, v_admin)
    returning id into v_gasto;

  ------------------------------------------------------------------ triggers
  perform test_rls.afirmar(
    (select correo from public.miembros where id = v_ana) = 'ana@prueba.test',
    'el correo de un miembro se guarda en minúsculas');

  ---------------------------------------------------- no miembro: no ve nada
  perform test_rls.como('intruso@prueba.test');

  perform test_rls.afirmar((select count(*) from public.gastos) = 0,
    'no miembro: no ve gastos');
  perform test_rls.afirmar((select count(*) from public.categorias) = 0,
    'no miembro: no ve categorías');
  perform test_rls.afirmar((select count(*) from public.tipos_pago) = 0,
    'no miembro: no ve tipos de pago');
  perform test_rls.afirmar((select count(*) from public.miembros) = 0,
    'no miembro: no ve miembros');
  perform test_rls.afirmar(not public.es_miembro(), 'no miembro: es_miembro() = false');
  perform test_rls.afirmar(public.mi_miembro_id() is null,
    'no miembro: mi_miembro_id() es null');

  v_ok := false;
  begin
    insert into public.gastos (nombre, monto, fecha, categoria_id, tipo_pago_id, autor_id)
      values ('Colado', 1, current_date, v_cat, v_tipo, v_admin);
  exception when insufficient_privilege then v_ok := true;
  end;
  perform test_rls.afirmar(v_ok, 'no miembro: no puede insertar gastos');

  update public.gastos set nombre = 'Hackeado' where id = v_gasto;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 0, 'no miembro: no puede editar gastos');

  delete from public.gastos where id = v_gasto;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 0, 'no miembro: no puede borrar gastos');

  perform test_rls.volver();

  ----------------------------------------------------------- miembro normal
  perform test_rls.como('ANA@prueba.test');  -- el JWT también se compara en minúsculas

  perform test_rls.afirmar(public.es_miembro(), 'miembro: es_miembro() = true');
  perform test_rls.afirmar(not public.es_admin(), 'miembro: es_admin() = false');
  perform test_rls.afirmar(public.mi_miembro_id() = v_ana,
    'miembro: mi_miembro_id() devuelve su id');
  perform test_rls.afirmar((select count(*) from public.gastos where id = v_gasto) = 1,
    'miembro: ve los gastos del hogar');
  perform test_rls.afirmar((select count(*) from public.categorias where id = v_cat) = 1,
    'miembro: ve las categorías');
  perform test_rls.afirmar((select count(*) from public.miembros) >= 2,
    'miembro: ve a los miembros');

  -- Inserta un gasto con su propio autor_id.
  insert into public.gastos (nombre, monto, fecha, categoria_id, tipo_pago_id, autor_id)
    values ('Gasto de Ana', 25.50, current_date, v_cat, v_tipo, v_ana);
  perform test_rls.afirmar(true, 'miembro: inserta gastos con su propio autor_id');

  -- No puede suplantar a otro autor.
  v_ok := false;
  begin
    insert into public.gastos (nombre, monto, fecha, categoria_id, tipo_pago_id, autor_id)
      values ('Suplantación', 1, current_date, v_cat, v_tipo, v_admin);
  exception when insufficient_privilege then v_ok := true;
  end;
  perform test_rls.afirmar(v_ok, 'miembro: no puede insertar con el autor_id de otro');

  -- Puede editar un gasto ajeno, pero no cambiar el autor (trigger).
  update public.gastos set nombre = 'Editado por Ana' where id = v_gasto;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 1, 'miembro: puede editar gastos del hogar');

  v_ok := false;
  begin
    update public.gastos set autor_id = v_ana where id = v_gasto;
  exception when check_violation then v_ok := true;
  end;
  perform test_rls.afirmar(v_ok, 'miembro: no puede cambiar el autor de un gasto');

  -- No admin: no toca categorías, tipos de pago ni miembros.
  v_ok := false;
  begin
    insert into public.categorias (nombre) values ('Colada');
  exception when insufficient_privilege then v_ok := true;
  end;
  perform test_rls.afirmar(v_ok, 'miembro: no puede crear categorías');

  update public.categorias set nombre = 'Hackeada' where id = v_cat;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 0, 'miembro: no puede modificar categorías');

  delete from public.categorias where id = v_cat;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 0, 'miembro: no puede borrar categorías');

  update public.tipos_pago set nombre = 'Hackeado' where id = v_tipo;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 0, 'miembro: no puede modificar tipos de pago');

  v_ok := false;
  begin
    insert into public.miembros (correo, nombre) values ('otro@prueba.test', 'Otro');
  exception when insufficient_privilege then v_ok := true;
  end;
  perform test_rls.afirmar(v_ok, 'miembro: no puede agregar miembros');

  update public.miembros set es_admin = true where id = v_ana;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 0, 'miembro: no puede volverse admin');

  -- Puede borrar gastos (cualquier miembro, como en la versión anterior).
  delete from public.gastos where id = v_gasto;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 1, 'miembro: puede borrar gastos del hogar');

  perform test_rls.volver();

  ----------------------------------------------------------------- miembro inactivo
  update public.miembros set activo = false where id = v_ana;
  perform test_rls.como('ana@prueba.test');
  perform test_rls.afirmar((select count(*) from public.gastos) = 0,
    'miembro inactivo: no ve nada');
  perform test_rls.volver();
  update public.miembros set activo = true where id = v_ana;

  ------------------------------------------------------------------- admin
  perform test_rls.como('admin@prueba.test');

  perform test_rls.afirmar(public.es_admin(), 'admin: es_admin() = true');

  insert into public.categorias (nombre, orden) values ('Nueva del admin', 998);
  perform test_rls.afirmar(true, 'admin: puede crear categorías');

  update public.categorias set activa = false where id = v_cat;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 1, 'admin: puede modificar categorías');

  update public.tipos_pago set activo = false where id = v_tipo;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 1, 'admin: puede modificar tipos de pago');

  insert into public.miembros (correo, nombre) values ('Nuevo@Prueba.Test', 'Nuevo');
  perform test_rls.afirmar(
    exists (select 1 from public.miembros where correo = 'nuevo@prueba.test'),
    'admin: puede agregar miembros (correo normalizado)');

  update public.miembros set es_admin = true where id = v_ana;
  get diagnostics v_n = row_count;
  perform test_rls.afirmar(v_n = 1, 'admin: puede editar miembros');

  perform test_rls.volver();

  ------------------------------------------------------------ integridad
  -- Una categoría con gastos no se puede borrar (on delete restrict).
  insert into public.gastos (nombre, monto, fecha, categoria_id, tipo_pago_id, autor_id)
    values ('Ancla', 1, current_date, v_cat, v_tipo, v_admin);
  v_ok := false;
  begin
    delete from public.categorias where id = v_cat;
  exception when foreign_key_violation then v_ok := true;
  end;
  perform test_rls.afirmar(v_ok, 'una categoría con gastos no se puede borrar');

  ------------------------------------------------------ suscripciones push
  insert into public.suscripciones_push (endpoint, p256dh, auth, miembro_id)
    values ('https://push.test/admin', 'k', 'a', v_admin);

  perform test_rls.como('intruso@prueba.test');
  select count(*) into v_n from public.suscripciones_push;
  perform test_rls.afirmar(v_n = 0, 'no miembro: no ve suscripciones');
  perform test_rls.volver();

  perform test_rls.como('ana@prueba.test');
  select count(*) into v_n from public.suscripciones_push where endpoint = 'https://push.test/admin';
  perform test_rls.afirmar(v_n = 1, 'miembro: ve las suscripciones de todos');
  v_ok := false;
  begin
    insert into public.suscripciones_push (endpoint, p256dh, auth, miembro_id)
      values ('https://push.test/falsa', 'k', 'a', v_admin);
  exception when insufficient_privilege then v_ok := true;
  end;
  perform test_rls.afirmar(v_ok, 'miembro: no registra suscripción a nombre de otro');
  insert into public.suscripciones_push (endpoint, p256dh, auth, miembro_id)
    values ('https://push.test/ana', 'k', 'a', v_ana);
  perform test_rls.afirmar(true, 'miembro: registra su propia suscripción');
  perform test_rls.volver();

  raise notice 'RLS: todo bien';
end;
$$;

rollback;
