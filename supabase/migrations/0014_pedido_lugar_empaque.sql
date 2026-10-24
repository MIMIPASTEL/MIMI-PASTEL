-- =====================================================================
-- 0014_pedido_lugar_empaque.sql
-- Especificaciones de los pedidos eventuales: lugar de entrega y empaque.
-- =====================================================================

alter table pedidos add column if not exists lugar text;
alter table pedido_items add column if not exists empaque text;

comment on column pedidos.lugar is 'Direccion o referencia donde se entrega el pedido eventual.';
comment on column pedido_items.empaque is 'Tipo de empaque: caja, bolsa, bandeja, otro.';

select count(*) as pedidos from pedidos;
