update productos set nombre = 'Torta de chocolate 800 g', tajadas_por_molde = 26 where codigo = 'T.CH';

insert into productos (codigo, nombre, unidad, orden, tajadas_por_molde)
values ('T.CH.1K', 'Torta de chocolate 1 kg', 'unidad', 101, 33)
on conflict (codigo) do nothing;

insert into presentaciones (producto_id, nombre, es_default, orden)
select id, 'Molde entero', true, 1 from productos where codigo = 'T.CH.1K'
on conflict (producto_id, nombre) do nothing;

insert into precios_cliente (producto_id, presentacion_id, tipo_cliente, precio)
select p.id, pr.id, t.tipo, 60.00
  from productos p
  join presentaciones pr on pr.producto_id = p.id and pr.nombre = 'Molde entero'
  cross join (values ('directo'),('distribuidor')) as t(tipo)
 where p.codigo = 'T.CH.1K'
on conflict (producto_id, presentacion_id, tipo_cliente) do update set precio = 60.00;

update precios_cliente pc set precio = 0
 from presentaciones pr, productos p
 where pr.id = pc.presentacion_id and p.id = pr.producto_id
   and p.codigo = 'T.CH' and pr.nombre = 'Molde entero';

insert into insumos (nombre, unidad_base, precio_unitario) values ('Naranja', 'kg', 3.00)
on conflict (nombre) do update set precio_unitario = 3.00;

update insumos set precio_unitario = 3.60 where nombre = 'Pan';
update insumos set precio_unitario = 18.00 where nombre = 'Emulsionante';
update insumos set precio_unitario = 0 where nombre in ('Jugo de naranja', 'Ralladura de naranja');

select p.codigo, p.nombre, p.tajadas_por_molde from productos p where p.codigo like 'T.CH%' order by p.orden;
select nombre, precio_unitario from insumos where nombre in ('Pan','Emulsionante','Naranja','Premezcla') order by nombre;
