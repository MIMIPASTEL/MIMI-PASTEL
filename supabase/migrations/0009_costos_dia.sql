-- =====================================================================
-- 0009_costos_dia.sql
-- Separa tres cosas que suelen confundirse:
--   1. costo de producción del día (lo que se invirtió)
--   2. costo de lo vendido (COGS: costo de los lotes que realmente salieron)
--   3. valor del sobrante que pasa al día siguiente (inventario)
--
-- Identidad que debe cumplirse:
--   costo_produccion + valor_sobrante_ayer
--     = cogs + valor_sobrante_hoy + valor_merma
-- =====================================================================

create or replace view v_costos_dia as
with fechas as (
  select fecha from lotes_produccion
  union select fecha from ventas
  union select fecha from sobrantes
  union select fecha from mermas
),
prod as (
  select fecha,
         sum(costo_total)          as costo_produccion,
         sum(cantidad_producida)   as unidades_producidas
    from lotes_produccion
   group by 1
),
vend as (
  select v.fecha,
         sum(vi.cantidad * coalesce(l.costo_unitario, 0)) as cogs,
         sum(vi.cantidad)                                 as unidades_vendidas
    from ventas v
    join venta_items vi on vi.venta_id = v.id
    left join lotes_produccion l on l.id = vi.lote_id
   group by 1
),
sob as (
  select s.fecha,
         sum(s.cantidad * coalesce(l.costo_unitario, 0)) as valor_sobrante,
         sum(s.cantidad)                                 as unidades_sobrante
    from sobrantes s
    left join lotes_produccion l on l.id = s.lote_id
   group by 1
),
mer as (
  select m.fecha,
         sum(m.cantidad * coalesce(l.costo_unitario, 0)) as valor_merma,
         sum(m.cantidad)                                 as unidades_merma
    from mermas m
    left join lotes_produccion l on l.id = m.lote_id
   group by 1
)
select
  f.fecha,
  coalesce(p.costo_produccion, 0)   as costo_produccion,
  coalesce(p.unidades_producidas, 0) as unidades_producidas,
  coalesce(v.cogs, 0)               as costo_ventas,
  coalesce(v.unidades_vendidas, 0)  as unidades_vendidas,
  coalesce(s0.valor_sobrante, 0)    as valor_sobrante_ayer,
  coalesce(s0.unidades_sobrante, 0) as unidades_sobrante_ayer,
  coalesce(s1.valor_sobrante, 0)    as valor_sobrante_hoy,
  coalesce(s1.unidades_sobrante, 0) as unidades_sobrante_hoy,
  coalesce(m.valor_merma, 0)        as valor_merma,
  coalesce(m.unidades_merma, 0)     as unidades_merma,
  -- comprobación contable: debe dar 0
  (coalesce(p.costo_produccion, 0) + coalesce(s0.valor_sobrante, 0))
    - (coalesce(v.cogs, 0) + coalesce(s1.valor_sobrante, 0) + coalesce(m.valor_merma, 0)) as descuadre
from fechas f
left join prod p on p.fecha = f.fecha
left join vend v on v.fecha = f.fecha
left join sob  s0 on s0.fecha = f.fecha - 1
left join sob  s1 on s1.fecha = f.fecha
left join mer  m on m.fecha = f.fecha;

comment on view v_costos_dia is
  'Costo de produccion del dia, costo de lo vendido (COGS) y valor del inventario que pasa al dia siguiente. '
  'descuadre debe ser 0: produccion + sobrante inicial = ventas + sobrante final + merma.';

-- ---------- Sugerido a producir (programa - sobrante del dia anterior) ----------
create or replace view v_sugerido_produccion as
with pedido as (
  select ri.producto_id,
         r.fecha,
         ri.destino_punto_id,
         sum(ri.cantidad) as programado
    from requerimiento_items ri
    join requerimientos r on r.id = ri.requerimiento_id
   where ri.destino_punto_id is not null
   group by 1, 2, 3
)
select
  p.fecha,
  p.destino_punto_id,
  p.producto_id,
  p.programado,
  coalesce(s.cantidad, 0) as sobrante_ayer,
  greatest(p.programado - coalesce(s.cantidad, 0), 0) as sugerido_producir,
  greatest(p.programado - coalesce(s.cantidad, 0), 0) = 0 as cubierto_por_sobrante
from pedido p
left join sobrantes s
       on s.fecha = p.fecha - 1
      and s.punto_venta_id = p.destino_punto_id
      and s.producto_id = p.producto_id;

comment on view v_sugerido_produccion is
  'Cuanto conviene producir de cada producto en cada punto, descontando el sobrante del dia anterior.';

select count(*) as dias_con_produccion from lotes_produccion;
