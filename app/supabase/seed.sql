-- Valores iniciales (CONTEXTO §2.4).
--
-- NO se siembran miembros: el primer admin se da de alta a mano desde el editor
-- SQL de Supabase (ver el paso 02 de los prompts). Así no hay correos reales en
-- el repositorio.

insert into public.categorias (nombre, orden) values
  ('Despensa', 1),
  ('Casa', 2),
  ('Servicios', 3),
  ('Transporte', 4),
  ('Salud', 5),
  ('Comida fuera', 6),
  ('Entretenimiento', 7),
  ('Ropa', 8),
  ('Hijos', 9),
  ('Otros', 10)
on conflict (nombre) do nothing;

insert into public.tipos_pago (nombre, orden) values
  ('Transferencia', 1),
  ('Crédito', 2),
  ('Débito', 3),
  ('Efectivo', 4)
on conflict (nombre) do nothing;
