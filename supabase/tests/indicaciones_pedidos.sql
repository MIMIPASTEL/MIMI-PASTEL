-- Carga las indicaciones que describió la dueña para los dos pedidos existentes
update pedido_items i
   set nota = 'Torta de cumpleaños de chocolate bañada en chantilly'
  from pedidos p
 where p.id = i.pedido_id and upper(p.cliente) like 'ROSA%';

update pedido_items i
   set nota = 'Torta de chocolate bañada en fudge y rellena de fudge'
  from pedidos p
 where p.id = i.pedido_id and upper(p.cliente) like 'JUAN VASQUEZ%';

select p.cliente, pr.codigo, i.cantidad, i.nota
  from pedido_items i
  join pedidos p on p.id = i.pedido_id
  join productos pr on pr.id = i.producto_id
 order by p.cliente;
