-- =====================================================================
-- 0011_conciliacion.sql
-- Conciliación de caja por punto y día:
--   venta bruta − descuentos/promociones = venta neta
--   venta neta = yape + transferencia + efectivo cobrado (± diferencia)
--   efectivo a entregar = efectivo cobrado − gastos pagados con ese efectivo
-- =====================================================================

alter table ventas add column if not exists descuento numeric(12,2) not null default 0;

comment on column ventas.descuento is
  'Descuentos y promociones aplicados a la venta (ej. 3 pasteles por S/ 5).';

-- gastos de caja necesitan saber de que punto salieron
alter table movimientos_caja add column if not exists punto_venta_id uuid references puntos_venta(id);

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

comment on view v_conciliacion is
  'Cuadre de dinero del dia: venta neta vs cobros, y efectivo que debe entregar la vendedora despues de gastos.';

select count(*) as movimientos from movimientos_caja;
