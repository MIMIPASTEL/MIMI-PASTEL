-- =====================================================================
-- 0023_relleno_pollo.sql
-- Relleno de pollo para 60 empanadas:
--   1 pecho de pollo (S/12) + 2.5 kg cebolla + 3 ají + perejil/culantro (S/1)
-- =====================================================================

insert into insumos (nombre, unidad_base, precio_unitario) values
  ('Pecho de pollo', 'unidad', 12.00),
  ('Perejil y culantro', 'unidad', 1.00)
on conflict (nombre) do update set precio_unitario = excluded.precio_unitario;

update insumos set precio_unitario = 0.3333 where nombre = 'Aji amarillo';

insert into preparaciones (nombre, rendimiento, unidad)
select 'Relleno de pollo', 60, 'porciones'
where not exists (select 1 from preparaciones where nombre = 'Relleno de pollo');

insert into preparacion_items (preparacion_id, insumo_id, cantidad)
select pr.id, i.id, v.cantidad
  from preparaciones pr
  cross join (values
    ('Pecho de pollo', 1.0),
    ('Cebolla', 2.5),
    ('Aji amarillo', 3.0),
    ('Perejil y culantro', 1.0)
  ) as v(nombre, cantidad)
  join insumos i on i.nombre = v.nombre
 where pr.nombre = 'Relleno de pollo'
on conflict (preparacion_id, insumo_id) do update set cantidad = excluded.cantidad;

-- La empanada de pollo usa 30 porciones para su tanda de 30 unidades
insert into receta_items (receta_id, preparacion_id, cantidad)
select r.id, pr.id, 30
  from recetas r
  join productos p on p.id = r.producto_id
  cross join preparaciones pr
 where p.codigo = 'E.P'
   and pr.nombre = 'Relleno de pollo'
   and not exists (
     select 1 from receta_items x where x.receta_id = r.id and x.preparacion_id = pr.id
   );

select codigo,
       round(costo_insumos::numeric, 3) as insumos,
       round(costo_fijo_unitario::numeric, 3) as fijo,
       round(costo_unitario::numeric, 3) as total
  from v_costo_unitario
 where codigo in ('E.C','E.P')
 order by codigo;
