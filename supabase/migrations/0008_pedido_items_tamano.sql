-- =====================================================================
-- 0008_pedido_items_tamano.sql
-- Tamaño / porciones del producto pedido (ej. "grande", "20 porciones").
-- =====================================================================

alter table pedido_items add column if not exists tamano text;

comment on column pedido_items.tamano is
  'Tamaño o porciones del producto pedido. Se muestra al personal de producción junto a las indicaciones.';

select count(*) as items from pedido_items;
