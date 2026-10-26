-- =====================================================================
-- 0025_precios_distribuidor_y_tortas.sql
-- Distribuidor a S/ 1.667 (docena S/ 20), torta de chocolate y
-- torta especial de medio kilo.
-- =====================================================================

-- 1. Distribuidor = 1.667 para los productos que al directo valen S/ 2.00
update precios_cliente pc
   set precio = 1.667
  from presentaciones pr, precios_cliente d
 where pr.id = pc.presentacion_id
   and d.presentacion_id = pc.presentacion_id
   and d.tipo_cliente = 'directo'
   and pc.tipo_cliente = 'distribuidor'
   and pr.nombre <> 'Molde entero'
   and d.precio = 2.00;

-- 2. Torta de chocolate: tajada S/ 2.00 (directo y distribuidor)
update precios_cliente pc
   set precio = 2.00
  from presentaciones pr, productos p
 where pr.id = pc.presentacion_id
   and p.id = pr.producto_id
   and p.codigo = 'T.CH'
   and pr.nombre = 'Tajada';

-- 3. Torta de chocolate: molde de 1 kg a S/ 60
update precios_cliente pc
   set precio = 60.00
  from presentaciones pr, productos p
 where pr.id = pc.presentacion_id
   and p.id = pr.producto_id
   and p.codigo = 'T.CH'
   and pr.nombre = 'Molde entero';

-- 4. Torta de chocolate especial de medio kilo (solo por molde)
insert into productos (codigo, nombre, unidad, orden)
values ('T.CH.E', 'Torta de chocolate especial 1/2 kg', 'unidad', 100)
on conflict (codigo) do nothing;

insert into presentaciones (producto_id, nombre, es_default, orden)
select id, 'Molde entero', true, 1 from productos where codigo = 'T.CH.E'
on conflict (producto_id, nombre) do nothing;

insert into precios_cliente (producto_id, presentacion_id, tipo_cliente, precio)
select p.id, pr.id, t.tipo, 50.00
  from productos p
  join presentaciones pr on pr.producto_id = p.id
  cross join (values ('directo'),('distribuidor')) as t(tipo)
 where p.codigo = 'T.CH.E'
on conflict (producto_id, presentacion_id, tipo_cliente) do update set precio = excluded.precio;

select p.codigo, pr.nombre as presentacion, pc.tipo_cliente, pc.precio
  from precios_cliente pc
  join productos p on p.id = pc.producto_id
  join presentaciones pr on pr.id = pc.presentacion_id
 where p.codigo in ('E.C','ES.C','T.CH','T.CH.E','Q.V','Q.N')
 order by p.codigo, pr.nombre, pc.tipo_cliente;
