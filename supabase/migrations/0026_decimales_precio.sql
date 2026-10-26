-- =====================================================================
-- 0026_decimales_precio.sql  (generado)
-- Permite 4 decimales en los precios para que la docena cuadre exacta.
-- =====================================================================

drop view if exists v_cierre_turno cascade;
drop view if exists v_conciliacion cascade;
drop view if exists v_cuadre_dinero cascade;
drop view if exists v_ventas_por_canal cascade;
drop view if exists v_utilidad_dia cascade;
drop view if exists v_costos_dia cascade;
drop view if exists v_cuadre_unidades cascade;

alter table venta_items drop column if exists subtotal;
alter table venta_items alter column precio_unitario type numeric(12,4);
alter table venta_items
  add column subtotal numeric(12,2) generated always as (cantidad * precio_unitario) stored;

alter table pedido_items alter column precio_unitario type numeric(12,4);
alter table precios alter column precio type numeric(12,4);
alter table precios_cliente alter column precio type numeric(12,4);

update precios_cliente set precio = 1.6667
 where tipo_cliente = 'distribuidor' and round(precio, 2) = 1.67;

update productos set tajadas_por_molde = 33 where codigo = 'T.CH';

-- recrear vistas
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
  coalesce(sob.q, 0) as sobrante_hoy,
  coalesce(mer.q, 0) as merma,
  (coalesce(sa.q, 0) + coalesce(env.q, 0) - coalesce(ven.q, 0) - coalesce(sob.q, 0) - coalesce(mer.q, 0)) as diferencia
from base b
left join lateral (
  select sum(s.cantidad) q
    from sobrantes s
    join puntos_venta pv on pv.id = b.punto_venta_id
   where s.producto_id = b.producto_id
     and s.punto_venta_id = coalesce(
           pv.punto_anterior_id,
           (select x.id from puntos_venta x where x.punto_anterior_id = pv.id order by x.codigo limit 1),
           pv.id)
     and s.fecha = case when pv.punto_anterior_id is not null then b.fecha else b.fecha - 1 end
) sa on true
left join env on env.fecha = b.fecha and env.punto_venta_id = b.punto_venta_id and env.producto_id = b.producto_id
left join ven on ven.fecha = b.fecha and ven.punto_venta_id = b.punto_venta_id and ven.producto_id = b.producto_id
left join sob on sob.fecha = b.fecha and sob.punto_venta_id = b.punto_venta_id and sob.producto_id = b.producto_id
left join mer on mer.fecha = b.fecha and mer.punto_venta_id = b.punto_venta_id and mer.producto_id = b.producto_id;

create or replace view v_sugerido_produccion as
with prog as (
  select r.fecha,
         ri.destino_punto_id,
         ri.producto_id,
         sum(ri.cantidad) as programado
    from requerimiento_items ri
    join requerimientos r on r.id = ri.requerimiento_id
   where ri.destino_punto_id is not null
   group by 1,2,3
)
select
  p.fecha,
  p.destino_punto_id,
  p.producto_id,
  p.programado,
  coalesce(sa.q, 0) as sobrante_ayer,
  greatest(p.programado - coalesce(sa.q, 0), 0) as sugerido_producir,
  coalesce(sa.q, 0) >= p.programado as cubierto_por_sobrante
from prog p
left join lateral (
  select sum(s.cantidad) q
    from sobrantes s
    join puntos_venta pv on pv.id = p.destino_punto_id
   where s.producto_id = p.producto_id
     and s.punto_venta_id = coalesce(
           pv.punto_anterior_id,
           (select x.id from puntos_venta x where x.punto_anterior_id = pv.id order by x.codigo limit 1),
           pv.id)
     and s.fecha = case when pv.punto_anterior_id is not null then p.fecha else p.fecha - 1 end
) sa on true;

create or replace view v_conciliacion as
with it as (
  select v.fecha,
         v.punto_venta_id,
         sum(vi.cantidad * vi.precio_unitario) as venta_bruta
    from ventas v
    join venta_items vi on vi.venta_id = v.id
   group by 1,2
),
dcto as (
  select fecha, punto_venta_id, sum(descuento) as descuento
    from ventas
   group by 1,2
),
pag as (
  select fecha, punto_venta_id,
         coalesce(sum(monto) filter (where medio = 'efectivo'), 0)      as efectivo,
         coalesce(sum(monto) filter (where medio = 'yape'), 0)          as yape,
         coalesce(sum(monto) filter (where medio = 'transferencia'), 0) as transferencia,
         coalesce(sum(monto) filter (where medio = 'tarjeta'), 0)       as tarjeta,
         coalesce(sum(monto) filter (where medio = 'fiado'), 0)         as fiado
    from pagos
   group by 1,2
),
gas as (
  select m.fecha, m.punto_venta_id,
         coalesce(sum(m.monto), 0) as gastos_efectivo
    from movimientos_caja m
   where m.tipo = 'salida'
     and m.medio = 'efectivo'
     and m.punto_venta_id is not null
   group by 1,2
),
fechas as (
  select fecha, punto_venta_id from it
  union select fecha, punto_venta_id from pag
  union select fecha, punto_venta_id from gas
)
select
  f.fecha,
  f.punto_venta_id,
  coalesce(it.venta_bruta, 0)                                   as venta_bruta,
  coalesce(d.descuento, 0)                                      as descuento,
  coalesce(it.venta_bruta, 0) - coalesce(d.descuento, 0)        as venta_neta,
  coalesce(p.yape, 0)                                           as yape,
  coalesce(p.transferencia, 0)                                  as transferencia,
  coalesce(p.efectivo, 0)                                       as efectivo_cobrado,
  coalesce(p.fiado, 0)                                          as fiado,
  coalesce(g.gastos_efectivo, 0)                                as gastos_efectivo,
  coalesce(p.efectivo, 0) - coalesce(g.gastos_efectivo, 0)      as efectivo_a_entregar,
  (coalesce(p.efectivo, 0) + coalesce(p.yape, 0) + coalesce(p.transferencia, 0) + coalesce(p.fiado, 0))
    - (coalesce(it.venta_bruta, 0) - coalesce(d.descuento, 0))  as diferencia_cobro
from fechas f
left join it   on it.fecha = f.fecha and it.punto_venta_id = f.punto_venta_id
left join dcto d on d.fecha = f.fecha and d.punto_venta_id = f.punto_venta_id
left join pag p on p.fecha = f.fecha and p.punto_venta_id = f.punto_venta_id
left join gas  g on g.fecha = f.fecha and g.punto_venta_id = f.punto_venta_id;

create or replace view v_cierre_turno as
select
  c.fecha,
  c.punto_venta_id,
  coalesce(c.enviado, 0)        as enviado,
  coalesce(c.vendido, 0)        as vendido,
  coalesce(c.sobrante_ayer, 0)  as sobrante_ayer,
  coalesce(c.sobrante_hoy, 0)   as sobrante,
  coalesce(c.merma, 0)          as merma,
  coalesce(c.diferencia, 0)     as dif_unidades,
  coalesce(m.venta_bruta, 0)    as venta_bruta,
  coalesce(m.descuento, 0)      as descuento,
  coalesce(m.venta_neta, 0)     as venta_neta,
  coalesce(m.yape, 0)           as yape,
  coalesce(m.transferencia, 0)  as transferencia,
  coalesce(m.efectivo_cobrado, 0) as efectivo,
  coalesce(m.gastos_efectivo, 0)  as gastos,
  coalesce(m.efectivo_a_entregar, 0) as efectivo_a_entregar,
  coalesce(m.diferencia_cobro, 0) as dif_dinero
from (
  select fecha, punto_venta_id,
         sum(enviado) enviado, sum(vendido) vendido,
         sum(sobrante_ayer) sobrante_ayer, sum(sobrante_hoy) sobrante_hoy,
         sum(merma) merma, sum(diferencia) diferencia
    from v_cuadre_unidades
   group by 1,2
) c
left join v_conciliacion m
  on m.fecha = c.fecha and m.punto_venta_id = c.punto_venta_id;

create or replace view v_costo_unitario as
with par as (select * from parametros_costeo where id = 1),
rec as (
  select r.id as receta_id, r.producto_id, r.rendimiento
    from recetas r
    join (select producto_id, max(version) as v from recetas group by 1) m
      on m.producto_id = r.producto_id and m.v = r.version
),
directos as (
  select rec.producto_id,
         sum((ri.cantidad / nullif(rec.rendimiento, 0)) * i.precio_unitario) as costo
    from rec
    join receta_items ri on ri.receta_id = rec.receta_id
    join insumos i on i.id = ri.insumo_id
   where ri.insumo_id is not null
   group by 1
),
via_prep as (
  select rec.producto_id,
         sum((ri.cantidad / nullif(rec.rendimiento, 0))
             * (pi.cantidad / nullif(pr.rendimiento, 0))
             * i.precio_unitario) as costo
    from rec
    join receta_items ri on ri.receta_id = rec.receta_id
    join preparaciones pr on pr.id = ri.preparacion_id
    join preparacion_items pi on pi.preparacion_id = pr.id
    join insumos i on i.id = pi.insumo_id
   group by 1
)
select
  p.id as producto_id,
  p.codigo,
  p.nombre,
  coalesce(d.costo, 0) + coalesce(v.costo, 0)                     as costo_insumos,
  (par.mano_obra_dia + par.gas_dia + par.luz_dia + par.otros_dia)
    / nullif(par.unidades_dia, 0)                                 as costo_fijo_unitario,
  coalesce(d.costo, 0) + coalesce(v.costo, 0)
    + (par.mano_obra_dia + par.gas_dia + par.luz_dia + par.otros_dia)
      / nullif(par.unidades_dia, 0)                               as costo_unitario
from productos p
join rec on rec.producto_id = p.id
cross join par
left join directos d on d.producto_id = p.id
left join via_prep v on v.producto_id = p.id;
