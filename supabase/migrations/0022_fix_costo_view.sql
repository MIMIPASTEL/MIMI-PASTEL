-- Solo productos que tienen receta cargada
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

select codigo, round(costo_insumos::numeric,3) insumos,
       round(costo_fijo_unitario::numeric,3) fijo,
       round(costo_unitario::numeric,3) total
  from v_costo_unitario order by codigo;
