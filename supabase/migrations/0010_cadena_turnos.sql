-- =====================================================================
-- 0010_cadena_turnos.sql
-- MAXI 1 y MAXI 2 son el mismo puesto con relevo: el turno que sale
-- reporta sus sobrantes y esos sobrantes son el inventario inicial
-- del turno siguiente. Al cerrar el día, el sobrante de MAXI 2 es el
-- que pasa al MAXI 1 del día siguiente.
--
--   MAXI1 (día d) inicial = sobrante MAXI2 (día d-1)
--   MAXI2 (día d) inicial = sobrante MAXI1 (día d)
-- =====================================================================

alter table puntos_venta
  add column if not exists punto_anterior_id uuid references puntos_venta(id);

comment on column puntos_venta.punto_anterior_id is
  'Turno que entrega el inventario a este punto dentro del mismo día. MAXI2 -> MAXI1.';

update puntos_venta
   set punto_anterior_id = (select id from puntos_venta where codigo = 'MAXI1')
 where codigo = 'MAXI2'
   and punto_anterior_id is null;

-- ---------- Cuadre por unidades, encadenando turnos ----------
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

comment on view v_cuadre_unidades is
  'Cuadre por turno. El inventario inicial del turno es el sobrante que reporto el turno anterior.';

-- ---------- Cuanto producir, descontando el sobrante disponible ----------
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

select p.codigo, p.nombre, a.codigo as turno_anterior
  from puntos_venta p
  left join puntos_venta a on a.id = p.punto_anterior_id
 where p.codigo in ('MAXI1','MAXI2');
