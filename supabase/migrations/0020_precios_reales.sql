-- =====================================================================
-- 0020_precios_reales.sql
-- Precios de insumos tomados de "mimi productos.xlsx" (hoja de costos)
-- =====================================================================

insert into insumos (nombre, unidad_base) values
  ('Huevo', 'kg'),
  ('Premezcla', 'kg'),
  ('Mantequilla', 'kg'),
  ('Polvo de hornear', 'kg'),
  ('Vainilla', 'l'),
  ('Bicarbonato', 'kg'),
  ('Coco rallado', 'kg')
on conflict (nombre) do nothing;

update insumos set precio_unitario = 2.618  where nombre = 'Harina';
update insumos set precio_unitario = 7.857  where nombre = 'Manteca';
update insumos set precio_unitario = 2.40   where nombre = 'Azúcar';
update insumos set precio_unitario = 1.80   where nombre = 'Sal';
update insumos set precio_unitario = 0      where nombre = 'Agua';
update insumos set precio_unitario = 6.00   where nombre = 'Carne';
update insumos set precio_unitario = 2.00   where nombre = 'Cebolla';
update insumos set precio_unitario = 25.00  where nombre = 'Queso';
update insumos set precio_unitario = 7.789  where nombre = 'Manjar';
update insumos set precio_unitario = 58.75  where nombre = 'Cocoa';
update insumos set precio_unitario = 5.60   where nombre = 'Aceite';
update insumos set precio_unitario = 6.40   where nombre = 'Huevo';
update insumos set precio_unitario = 7.124  where nombre = 'Premezcla';
update insumos set precio_unitario = 14.00  where nombre = 'Mantequilla';
update insumos set precio_unitario = 8.50   where nombre = 'Polvo de hornear';
update insumos set precio_unitario = 23.00  where nombre = 'Vainilla';
update insumos set precio_unitario = 6.00   where nombre = 'Bicarbonato';
update insumos set precio_unitario = 9.00   where nombre = 'Coco rallado';

select nombre, unidad_base, precio_unitario
  from insumos
 where precio_unitario > 0
 order by nombre;
