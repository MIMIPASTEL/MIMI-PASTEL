-- =====================================================================
-- 0021_costeo_real.sql
-- Parámetros de costeo (mano de obra, gas, luz) + empaques + costo unitario
-- =====================================================================

-- Harina actualizada: saco de 50 kg a S/ 148
update insumos set precio_unitario = 2.96 where nombre = 'Harina';

-- Empaques con precio unitario
insert into insumos (nombre, unidad_base, precio_unitario) values
  ('Bolsa', 'unidad', 0.00767),
  ('Plato para torta', 'unidad', 0.10),
  ('Cucharita', 'unidad', 0.03)
on conflict (nombre) do update set precio_unitario = excluded.precio_unitario;

-- ---------- Parámetros del negocio ----------
create table if not exists parametros_costeo (
  id              smallint primary key default 1 check (id = 1),
  mano_obra_dia   numeric(12,2) not null default 0,
  gas_dia         numeric(12,2) not null default 0,
  luz_dia         numeric(12,2) not null default 0,
  otros_dia       numeric(12,2) not null default 0,
  unidades_dia    numeric(12,2) not null default 1,
  actualizado_en  timestamptz not null default now()
);

insert into parametros_costeo (id, mano_obra_dia, gas_dia, luz_dia, otros_dia, unidades_dia)
values (1, 120.00, 35.00, 6.00, 0.00, 300)
on conflict (id) do nothing;

alter table parametros_costeo enable row level security;
drop policy if exists parametros_costeo_lectura on parametros_costeo;
create policy parametros_costeo_lectura on parametros_costeo for select to authenticated using (true);
drop policy if exists parametros_costeo_admin on parametros_costeo;
create policy parametros_costeo_admin on parametros_costeo for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

-- ---------- Costo unitario por producto ----------
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
cross join par
left join directos d on d.producto_id = p.id
left join via_prep v on v.producto_id = p.id;

comment on view v_costo_unitario is
  'Costo unitario = insumos según receta + (mano de obra + gas + luz + otros) ÷ unidades del día.';

select codigo, round(costo_insumos::numeric, 3) as insumos,
       round(costo_fijo_unitario::numeric, 3) as fijo,
       round(costo_unitario::numeric, 3) as total
  from v_costo_unitario
 where codigo in ('E.C','E.P','MZA','QUESO')
 order by codigo;
