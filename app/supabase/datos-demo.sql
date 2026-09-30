-- Datos de demostración para probar el paso 05 (sin correos reales).
-- Aplicar: pnpm db:demo   (se puede repetir: primero borra lo demo).
-- Quitar todo: las dos primeras sentencias de este archivo.
delete from gastos where notas = '[demo]';
delete from miembros where correo = 'demo@example.com';

insert into miembros (correo, nombre) values ('demo@example.com', 'Invitada demo');

-- autor 1 = primer miembro real (o la demo si aún no hay), autor 2 = la demo.
insert into gastos (nombre, monto, fecha, categoria_id, tipo_pago_id, autor_id, notas)
select v.nombre, v.monto, v.fecha::date, c.id, t.id,
       case v.autor when 1 then coalesce(real.id, demo.id) else demo.id end, '[demo]'
from (values
  -- septiembre 2026: 6 gastos, total 3155.99, promedio 526
  ('Despensa semanal',  1250.50, '2026-09-28', 'Despensa',        'Débito',        1),
  ('Luz',                480.10, '2026-09-28', 'Servicios',       'Transferencia', 2),
  ('Gasolina',           600.00, '2026-09-25', 'Transporte',      'Crédito',       1),
  ('Tacos',              215.40, '2026-09-25', 'Comida fuera',    'Efectivo',      2),
  ('Farmacia',           329.99, '2026-09-12', 'Salud',           'Débito',        1),
  ('Cine',               280.00, '2026-09-05', 'Entretenimiento', 'Crédito',       2),
  -- agosto 2026: 3 gastos, total 6279.50
  ('Despensa',           980.00, '2026-08-30', 'Despensa',        'Débito',        1),
  ('Renta',             4500.00, '2026-08-01', 'Casa',            'Transferencia', 2),
  ('Zapatos',            799.50, '2026-08-15', 'Ropa',            'Crédito',       1)
) as v(nombre, monto, fecha, cat, tipo, autor)
join categorias c on c.nombre = v.cat
join tipos_pago t on t.nombre = v.tipo
cross join (select id from miembros where correo = 'demo@example.com') demo
left join lateral (
  select id from miembros where correo <> 'demo@example.com' order by created_at limit 1
) real on true;
