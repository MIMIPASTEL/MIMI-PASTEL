-- =====================================================================
-- 0004_vistas.sql — Cuadre, ventas y utilidad diaria
-- =====================================================================

-- ---------- Cuadre de unidades por día / punto / producto ----------
-- Identidad: sobrante_ayer + enviado - vendido - sobrante_hoy - merma = diferencia
create or replace view v_cuadre_unidades as
with base as (
  select d.fecha, d.punto_venta_id, di.producto_id
    from despachos d join despacho_items di on di.despacho_id = d.id
  union
  select v.fecha, v.punto_venta_id, vi.producto_id
    from ventas v join venta_items vi on vi.venta_id = v.id
  union
  select s.fecha, s.punto_venta_id, s.producto_id from sobrantes s
  union
  select m.fecha, m.punto_venta_id, m.producto_id from mermas m where m.punto_venta_id is not null
  union
  select s.fecha + 1, s.punto_venta_id, s.producto_id from sobrantes s
),
env as (
  select d.fecha, d.punto_venta_id, di.producto_id, sum(di.cantidad_enviada) q
    from despachos d join despacho_items di on di.despacho_id = d.id
   group by 1,2,3
),
ven as (
  select v.fecha, v.punto_venta_id, vi.producto_id, sum(vi.cantidad) q
    from ventas v join venta_items vi on vi.venta_id = v.id
   group by 1,2,3
),
sob as (
  select fecha, punto_venta_id, producto_id, sum(cantidad) q from sobrantes group by 1,2,3
),
mer as (
  select fecha, punto_venta_id, producto_id, sum(cantidad) q
    from mermas where punto_venta_id is not null group by 1,2,3
)
select
  b.fecha,
  b.punto_venta_id,
  b.producto_id,
  coalesce(sa.q, 0)  as sobrante_ayer,
  coalesce(env.q, 0) as enviado,
  coalesce(ven.q, 0) as vendido,
  coalesce(sh.q, 0)  as sobrante_hoy,
  coalesce(mer.q, 0) as merma,
  (coalesce(sa.q, 0) + coalesce(env.q, 0) - coalesce(ven.q, 0) - coalesce(sh.q, 0) - coalesce(mer.q, 0)) as diferencia
from base b
left join sob sa  on sa.fecha = b.fecha - 1 and sa.punto_venta_id = b.punto_venta_id and sa.producto_id = b.producto_id
left join env     on env.fecha = b.fecha     and env.punto_venta_id = b.punto_venta_id and env.producto_id = b.producto_id
left join ven     on ven.fecha = b.fecha     and ven.punto_venta_id = b.punto_venta_id and ven.producto_id = b.producto_id
left join sob sh  on sh.fecha = b.fecha      and sh.punto_venta_id = b.punto_venta_id and sh.producto_id = b.producto_id
left join mer     on mer.fecha = b.fecha     and mer.punto_venta_id = b.punto_venta_id and mer.producto_id = b.producto_id;

comment on view v_cuadre_unidades is
  'Diferencia = 0 significa que las unidades cuadran. Positivo = faltan unidades, negativo = sobran.';

-- ---------- Cuadre de dinero por punto y día ----------
create or replace view v_cuadre_dinero as
with esperado as (
  select v.fecha, v.punto_venta_id,
         sum(vi.cantidad * vi.precio_unitario) as venta_valorizada,
         sum(vi.cantidad) as unidades_vendidas
    from ventas v join venta_items vi on vi.venta_id = v.id
   group by 1,2
),
cobrado as (
  select p.fecha, p.punto_venta_id,
         sum(p.monto) filter (where p.medio = 'efectivo')      as efectivo,
         sum(p.monto) filter (where p.medio = 'yape')          as yape,
         sum(p.monto) filter (where p.medio = 'transferencia') as transferencia,
         sum(p.monto) filter (where p.medio = 'tarjeta')       as tarjeta,
         sum(p.monto) filter (where p.medio = 'fiado')         as fiado,
         sum(p.monto) as total_cobrado
    from pagos p
   group by 1,2
)
select
  coalesce(e.fecha, c.fecha)                        as fecha,
  coalesce(e.punto_venta_id, c.punto_venta_id)      as punto_venta_id,
  coalesce(e.venta_valorizada, 0)                   as venta_valorizada,
  coalesce(c.total_cobrado, 0)                      as total_cobrado,
  coalesce(c.efectivo, 0)                           as efectivo,
  coalesce(c.yape, 0)                               as yape,
  coalesce(c.transferencia, 0)                      as transferencia,
  coalesce(c.tarjeta, 0)                            as tarjeta,
  coalesce(c.fiado, 0)                              as fiado,
  coalesce(c.total_cobrado, 0) - coalesce(e.venta_valorizada, 0) as diferencia
from esperado e
full outer join cobrado c
  on c.fecha = e.fecha and c.punto_venta_id = e.punto_venta_id;

-- ---------- Ventas por canal ----------
create or replace view v_ventas_por_canal as
select v.fecha,
       v.punto_venta_id,
       pv.nombre as punto_venta,
       count(distinct v.id)                     as tickets,
       sum(vi.cantidad)                         as unidades,
       sum(vi.cantidad * vi.precio_unitario)    as total
  from ventas v
  join venta_items vi on vi.venta_id = v.id
  join puntos_venta pv on pv.id = v.punto_venta_id
 group by 1,2,3;

-- ---------- Gastos por categoría ----------
create or replace view v_gastos_categoria as
select m.fecha,
       m.categoria_codigo,
       cm.nombre as categoria,
       m.tipo,
       cm.afecta_utilidad,
       sum(m.monto) as total
  from movimientos_caja m
  join categorias_movimiento cm on cm.codigo = m.categoria_codigo
 group by 1,2,3,4,5;

-- ---------- Utilidad diaria ----------
create or replace view v_utilidad_dia as
with fechas as (
  select fecha from ventas
  union
  select fecha from movimientos_caja
  union
  select fecha from mermas
),
v as (
  select v.fecha, sum(vi.cantidad * vi.precio_unitario) as ventas
    from ventas v join venta_items vi on vi.venta_id = v.id
   group by 1
),
c as (
  select v.fecha, sum(vi.cantidad * coalesce(l.costo_unitario, 0)) as costo_ventas
    from ventas v
    join venta_items vi on vi.venta_id = v.id
    left join lotes_produccion l on l.id = vi.lote_id
   group by 1
),
g as (
  select m.fecha, sum(m.monto) as gastos
    from movimientos_caja m
    join categorias_movimiento cm on cm.codigo = m.categoria_codigo
   where m.tipo = 'salida' and cm.afecta_utilidad
   group by 1
),
mm as (
  select m.fecha, sum(m.cantidad * coalesce(l.costo_unitario, 0)) as merma_valorizada
    from mermas m
    left join lotes_produccion l on l.id = m.lote_id
   group by 1
)
select
  f.fecha,
  coalesce(v.ventas, 0)                       as ventas,
  coalesce(c.costo_ventas, 0)                 as costo_ventas,
  coalesce(v.ventas, 0) - coalesce(c.costo_ventas, 0) as margen_bruto,
  coalesce(g.gastos, 0)                       as gastos,
  coalesce(mm.merma_valorizada, 0)            as merma_valorizada,
  coalesce(v.ventas, 0) - coalesce(c.costo_ventas, 0)
    - coalesce(g.gastos, 0) - coalesce(mm.merma_valorizada, 0) as utilidad
from fechas f
left join v  on v.fecha = f.fecha
left join c  on c.fecha = f.fecha
left join g  on g.fecha = f.fecha
left join mm on mm.fecha = f.fecha;

comment on view v_utilidad_dia is
  'Utilidad = ventas - costo de lo vendido - gastos del negocio - merma valorizada. '
  'Los retiros, gastos personales y préstamos NO se descuentan aquí (afecta_utilidad = false).';
