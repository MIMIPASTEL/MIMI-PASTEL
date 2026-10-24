-- Prueba: un pedido debe quedar reflejado en el requerimiento de su fecha de entrega
delete from requerimiento_items where destino_pedido_id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from pedido_items where pedido_id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from pedidos where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into pedidos (id, cliente, fecha_entrega, estado)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'TEST SYNC', current_date + 1, 'confirmado');

insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
select 'aaaaaaaa-0000-0000-0000-000000000001', id, 12, 2.50 from productos where codigo = 'E.C';

insert into pedido_items (pedido_id, producto_id, cantidad, precio_unitario)
select 'aaaaaaaa-0000-0000-0000-000000000001', id, 6, 2.00 from productos where codigo = 'MH';

insert into requerimientos (fecha, estado)
values (current_date + 1, 'publicado')
on conflict (fecha) do nothing;

insert into requerimiento_items (requerimiento_id, producto_id, cantidad, destino_pedido_id, origen)
select r.id, pi.producto_id, pi.cantidad, pi.pedido_id, 'pedido'
  from pedido_items pi
  join requerimientos r on r.fecha = current_date + 1
 where pi.pedido_id = 'aaaaaaaa-0000-0000-0000-000000000001';

select p.cliente,
       pr.codigo as producto,
       ri.cantidad,
       ri.origen,
       r.fecha as fecha_produccion
  from requerimiento_items ri
  join pedidos p on p.id = ri.destino_pedido_id
  join productos pr on pr.id = ri.producto_id
  join requerimientos r on r.id = ri.requerimiento_id
 where ri.destino_pedido_id = 'aaaaaaaa-0000-0000-0000-000000000001';
