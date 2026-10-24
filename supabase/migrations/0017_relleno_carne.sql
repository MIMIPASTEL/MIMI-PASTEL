-- =====================================================================
-- 0017_relleno_carne.sql
-- Relleno de carne: se prepara en volumen y rinde 55 empanadas.
--   2.5 kg cebolla + 1 kg carne + 4 aji amarillo + condimentos
-- =====================================================================

insert into insumos (nombre, unidad_base) values
  ('Cebolla', 'kg'),
  ('Aji amarillo', 'unidad'),
  ('Pimienta', 'kg'),
  ('Comino', 'kg'),
  ('Sazonador', 'kg'),
  ('Ajinomoto', 'kg')
on conflict (nombre) do nothing;

insert into preparaciones (nombre, rendimiento, unidad)
select 'Relleno de carne', 55, 'porciones'
where not exists (select 1 from preparaciones where nombre = 'Relleno de carne');

insert into preparacion_items (preparacion_id, insumo_id, cantidad)
select pr.id, i.id, v.cantidad
  from preparaciones pr
  cross join (values ('Cebolla', 2.5), ('Carne', 1.0), ('Aji amarillo', 4.0)) as v(nombre, cantidad)
  join insumos i on i.nombre = v.nombre
 where pr.nombre = 'Relleno de carne'
on conflict (preparacion_id, insumo_id) do update set cantidad = excluded.cantidad;

-- La empanada de carne usa 1 porción de relleno por unidad (30 por tanda)
insert into receta_items (receta_id, preparacion_id, cantidad)
select r.id, pr.id, 30
  from recetas r
  join productos p on p.id = r.producto_id
  cross join preparaciones pr
 where p.codigo = 'E.C'
   and pr.nombre = 'Relleno de carne'
   and not exists (
     select 1 from receta_items x where x.receta_id = r.id and x.preparacion_id = pr.id
   );

select p.codigo as producto, r.rendimiento,
       pr.nombre as preparacion, ri.cantidad,
       pr.rendimiento as rinde_preparacion, pr.unidad
  from recetas r
  join productos p on p.id = r.producto_id
  left join receta_items ri on ri.receta_id = r.id
  left join preparaciones pr on pr.id = ri.preparacion_id
 where p.codigo = 'E.C';
