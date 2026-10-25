-- =====================================================================
-- 0018_stock_anterior_y_vida_util.sql
-- 1. El envío separa stock del día anterior y producción del día
-- 2. Vida útil por producto (2 días por regla general; los queques se
--    preparan interdiario)
-- =====================================================================

alter table despacho_items
  add column if not exists cantidad_stock numeric(12,3) not null default 0;

comment on column despacho_items.cantidad_stock is
  'Parte del envío que corresponde a sobrante del día anterior. El resto es producción del día.';

alter table productos
  add column if not exists dias_vida smallint not null default 2;

comment on column productos.dias_vida is
  'Días que el producto se puede vender. Al superarlo se descarta.';

-- Los queques se preparan interdiario y aguantan un día más
update productos set dias_vida = 3 where codigo in ('Q.V', 'Q.N', 'BUD');

-- Vista: stock disponible del día anterior por punto y producto,
-- con su edad y si ya debe descartarse
create or replace view v_stock_anterior as
select
  s.punto_venta_id,
  s.producto_id,
  s.fecha                                   as fecha_sobrante,
  coalesce(s.cantidad_reutilizable, s.cantidad) as cantidad,
  l.fecha                                   as fecha_produccion,
  (current_date - l.fecha)                  as dias,
  p.dias_vida,
  case
    when l.fecha is null then false
    when (current_date - l.fecha) >= p.dias_vida then true
    else false
  end                                       as descartar
from sobrantes s
join productos p on p.id = s.producto_id
left join lotes_produccion l on l.id = s.lote_id;

comment on view v_stock_anterior is
  'Sobrante disponible con la edad real del lote. descartar = true cuando ya cumplió su vida útil.';

select count(*) as productos_con_vida from productos where dias_vida > 0;
