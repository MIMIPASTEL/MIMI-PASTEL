-- =====================================================================
-- 0029b_nombres_y_budin.sql
-- =====================================================================

update productos set nombre = 'Torta de chocolate especial 1/2 kg' where codigo = 'T.CH.E';
update productos set nombre = 'Torta de chocolate 1 kg' where codigo = 'T.CH';

insert into insumos (nombre, unidad_base) values
  ('Pan', 'kg'),
  ('Esencia de vainilla', 'l'),
  ('Emulsionante', 'kg'),
  ('Jugo de naranja', 'l'),
  ('Ralladura de naranja', 'kg')
on conflict (nombre) do nothing;

insert into preparaciones (nombre, rendimiento, unidad)
select 'Budín (1 molde)', 1, 'molde'
where not exists (select 1 from preparaciones where nombre = 'Budín (1 molde)');

delete from preparacion_items
 where preparacion_id = (select id from preparaciones where nombre = 'Budín (1 molde)');

insert into preparacion_items (preparacion_id, insumo_id, cantidad)
select pr.id, i.id, v.cantidad
  from preparaciones pr
  cross join (values
    ('Pan', 1.000),
    ('Azúcar', 1.050),
    ('Agua', 2.000),
    ('Esencia de vainilla', 0.035),
    ('Sal', 0.005)
  ) as v(nombre, cantidad)
  join insumos i on i.nombre = v.nombre
 where pr.nombre = 'Budín (1 molde)';

insert into receta_items (receta_id, preparacion_id, cantidad)
select r.id, pr.id, 1
  from recetas r
  join productos p on p.id = r.producto_id
  cross join preparaciones pr
 where p.codigo = 'BUD'
   and pr.nombre = 'Budín (1 molde)'
   and not exists (
     select 1 from receta_items x where x.receta_id = r.id and x.preparacion_id = pr.id
   );

select p.codigo, p.nombre from productos p where p.codigo in ('T.CH', 'T.CH.E', 'BUD') order by p.codigo;

select i.nombre, pi.cantidad
  from preparacion_items pi
  join preparaciones pr on pr.id = pi.preparacion_id
  join insumos i on i.id = pi.insumo_id
 where pr.nombre = 'Budín (1 molde)'
 order by i.nombre;
