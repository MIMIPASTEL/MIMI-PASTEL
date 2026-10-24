-- Prueba de humo del motor de cuadre.
-- Escenario: 12 producidos a S/ 2.50 c/u · 10 enviados a MAXI1 · 8 vendidos a S/ 5.00
--            1 sobrante · 1 merma (roto) · cobrado S/ 30 efectivo + S/ 10 Yape
-- Esperado: diferencia unidades = 0 · diferencia dinero = 0 · utilidad = S/ 17.50

delete from mermas where producto_id = '11111111-1111-1111-1111-111111111111';
delete from sobrantes where producto_id = '11111111-1111-1111-1111-111111111111';
delete from pagos where venta_id = '44444444-4444-4444-4444-444444444444';
delete from venta_items where venta_id = '44444444-4444-4444-4444-444444444444';
delete from ventas where id = '44444444-4444-4444-4444-444444444444';
delete from despacho_items where despacho_id = '33333333-3333-3333-3333-333333333333';
delete from despachos where id = '33333333-3333-3333-3333-333333333333';
delete from consumos_insumo where lote_id = '22222222-2222-2222-2222-222222222222';
delete from lotes_produccion where id = '22222222-2222-2222-2222-222222222222';
delete from productos where id = '11111111-1111-1111-1111-111111111111';

insert into productos (id, codigo, nombre) values
  ('11111111-1111-1111-1111-111111111111', 'TEST', 'Producto de prueba');

insert into lotes_produccion (id, fecha, producto_id, cantidad_producida, costo_insumos, costo_mano_obra, punto_venta_id)
values ('22222222-2222-2222-2222-222222222222', current_date,
        '11111111-1111-1111-1111-111111111111', 12, 24.00, 6.00,
        (select id from puntos_venta where codigo = 'MAXI1'));

insert into despachos (id, fecha, punto_venta_id, turno, estado)
values ('33333333-3333-3333-3333-333333333333', current_date,
        (select id from puntos_venta where codigo = 'MAXI1'), 1, 'recibido');

insert into despacho_items (despacho_id, producto_id, cantidad_enviada, cantidad_recibida)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 10, 10);

insert into ventas (id, fecha, punto_venta_id, turno, total)
values ('44444444-4444-4444-4444-444444444444', current_date,
        (select id from puntos_venta where codigo = 'MAXI1'), 1, 40.00);

insert into venta_items (venta_id, producto_id, cantidad, precio_unitario, lote_id)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
        8, 5.00, '22222222-2222-2222-2222-222222222222');

insert into pagos (venta_id, punto_venta_id, fecha, medio, monto) values
  ('44444444-4444-4444-4444-444444444444', (select id from puntos_venta where codigo = 'MAXI1'), current_date, 'efectivo', 30.00),
  ('44444444-4444-4444-4444-444444444444', (select id from puntos_venta where codigo = 'MAXI1'), current_date, 'yape', 10.00);

insert into sobrantes (fecha, punto_venta_id, producto_id, cantidad, lote_id)
values (current_date, (select id from puntos_venta where codigo = 'MAXI1'),
        '11111111-1111-1111-1111-111111111111', 1, '22222222-2222-2222-2222-222222222222');

insert into mermas (fecha, producto_id, lote_id, punto_venta_id, cantidad, tipo, motivo)
values (current_date, '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        (select id from puntos_venta where codigo = 'MAXI1'), 1, 'vitrina', 'roto');

select 'CUADRE_UNIDADES' as prueba,
       sobrante_ayer, enviado, vendido, sobrante_hoy, merma, diferencia
  from v_cuadre_unidades
 where producto_id = '11111111-1111-1111-1111-111111111111'
 union all
select 'CUADRE_DINERO',
       venta_valorizada::numeric(12,3), total_cobrado::numeric(12,3), efectivo, yape, transferencia, diferencia
  from v_cuadre_dinero
 where punto_venta_id = (select id from puntos_venta where codigo = 'MAXI1')
 union all
select 'UTILIDAD',
       ventas, costo_ventas, margen_bruto, gastos, merma_valorizada, utilidad
  from v_utilidad_dia
 where fecha = current_date;
