-- Prueba de la cadena de turnos MAXI1 -> MAXI2
-- Escenario:
--   ayer  : MAXI2 cerró con 5 sobrantes
--   hoy T1: recibió 20, vendió 18, cerró con 7 sobrantes   -> 5 + 20 - 18 - 7 = 0
--   hoy T2: recibió 10, vendió 15, cerró con 2 sobrantes   -> 7 + 10 - 15 - 2 = 0

delete from venta_items where venta_id in ('bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
delete from ventas where id in ('bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
delete from despacho_items where despacho_id in ('cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002');
delete from despachos where id in ('cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002');
delete from sobrantes where producto_id = (select id from productos where codigo='E.C')
   and fecha in (current_date - 1, current_date);

-- ayer: sobrante de MAXI2
insert into sobrantes (fecha, punto_venta_id, producto_id, cantidad)
select current_date - 1, pv.id, p.id, 5
  from puntos_venta pv, productos p
 where pv.codigo = 'MAXI2' and p.codigo = 'E.C';

-- hoy MAXI1
insert into despachos (id, fecha, punto_venta_id, turno, estado)
select 'cccccccc-0000-0000-0000-000000000001', current_date, id, 1, 'recibido' from puntos_venta where codigo='MAXI1';
insert into despacho_items (despacho_id, producto_id, cantidad_enviada, cantidad_recibida)
select 'cccccccc-0000-0000-0000-000000000001', id, 20, 20 from productos where codigo='E.C';
insert into ventas (id, fecha, punto_venta_id, turno, total)
select 'bbbbbbbb-0000-0000-0000-000000000001', current_date, id, 1, 36 from puntos_venta where codigo='MAXI1';
insert into venta_items (venta_id, producto_id, cantidad, precio_unitario)
select 'bbbbbbbb-0000-0000-0000-000000000001', id, 18, 2 from productos where codigo='E.C';
insert into sobrantes (fecha, punto_venta_id, producto_id, cantidad)
select current_date, pv.id, p.id, 7 from puntos_venta pv, productos p
 where pv.codigo='MAXI1' and p.codigo='E.C';

-- hoy MAXI2
insert into despachos (id, fecha, punto_venta_id, turno, estado)
select 'cccccccc-0000-0000-0000-000000000002', current_date, id, 2, 'recibido' from puntos_venta where codigo='MAXI2';
insert into despacho_items (despacho_id, producto_id, cantidad_enviada, cantidad_recibida)
select 'cccccccc-0000-0000-0000-000000000002', id, 10, 10 from productos where codigo='E.C';
insert into ventas (id, fecha, punto_venta_id, turno, total)
select 'bbbbbbbb-0000-0000-0000-000000000002', current_date, id, 2, 30 from puntos_venta where codigo='MAXI2';
insert into venta_items (venta_id, producto_id, cantidad, precio_unitario)
select 'bbbbbbbb-0000-0000-0000-000000000002', id, 15, 2 from productos where codigo='E.C';
insert into sobrantes (fecha, punto_venta_id, producto_id, cantidad)
select current_date, pv.id, p.id, 2 from puntos_venta pv, productos p
 where pv.codigo='MAXI2' and p.codigo='E.C';

select pv.codigo as turno,
       v.sobrante_ayer, v.enviado, v.vendido, v.sobrante_hoy, v.merma, v.diferencia
  from v_cuadre_unidades v
  join puntos_venta pv on pv.id = v.punto_venta_id
 where v.producto_id = (select id from productos where codigo='E.C')
   and v.fecha = current_date
 order by pv.codigo;
