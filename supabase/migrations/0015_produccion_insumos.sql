-- =====================================================================
-- 0015_produccion_insumos.sql
-- 1. Sobrantes: cuanto se reutiliza y cuanto se merma
-- 2. Consumo diario de insumos (kg de masa, fruta, manjar...)
-- 3. Solicitudes de insumos que antes llegaban por WhatsApp
-- =====================================================================

-- ---------- 1. Sobrantes reutilizables ----------
alter table sobrantes add column if not exists cantidad_reutilizable numeric(12,3);

comment on column sobrantes.cantidad_reutilizable is
  'De lo que devolvio la vendedora, cuanto sirve para el dia siguiente. El resto es merma.';

-- ---------- 2. Consumo diario de insumos ----------
create table if not exists consumos_dia (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  insumo_id      uuid not null references insumos(id) on delete cascade,
  cantidad       numeric(12,3) not null check (cantidad > 0),
  costo_unitario numeric(12,4) not null default 0,
  nota           text,
  registrado_por uuid references perfiles(id),
  creado_en      timestamptz not null default now(),
  unique (fecha, insumo_id)
);

comment on table consumos_dia is
  'Insumos que se usaron en el dia. Sirve para saber el gasto real de materiales y proyectar compras.';

-- ---------- 3. Solicitudes de insumos ----------
create table if not exists solicitudes_insumo (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  insumo_id      uuid references insumos(id) on delete set null,
  nombre_libre   text,
  cantidad       numeric(12,3) not null check (cantidad > 0),
  nota           text,
  estado         text not null default 'pendiente',
  solicitado_por uuid references perfiles(id),
  resuelto_en    timestamptz,
  creado_en      timestamptz not null default now()
);

comment on table solicitudes_insumo is
  'Lo que produccion pide comprar (antes llegaba por WhatsApp).';

alter table insumos add column if not exists precio_unitario numeric(12,4) not null default 0;
comment on column insumos.precio_unitario is 'Costo por unidad base. Se usa para valorizar el consumo diario.';

-- ---------- RLS ----------
alter table consumos_dia enable row level security;
alter table solicitudes_insumo enable row level security;

drop policy if exists consumos_dia_lectura on consumos_dia;
create policy consumos_dia_lectura on consumos_dia for select to authenticated using (true);

drop policy if exists consumos_dia_admin on consumos_dia;
create policy consumos_dia_admin on consumos_dia for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

drop policy if exists consumos_dia_produccion on consumos_dia;
create policy consumos_dia_produccion on consumos_dia for all to authenticated
  using (app.rol_actual() = 'produccion') with check (app.rol_actual() = 'produccion');

drop policy if exists solicitudes_insumo_lectura on solicitudes_insumo;
create policy solicitudes_insumo_lectura on solicitudes_insumo for select to authenticated using (true);

drop policy if exists solicitudes_insumo_admin on solicitudes_insumo;
create policy solicitudes_insumo_admin on solicitudes_insumo for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

drop policy if exists solicitudes_insumo_produccion on solicitudes_insumo;
create policy solicitudes_insumo_produccion on solicitudes_insumo for all to authenticated
  using (app.rol_actual() = 'produccion') with check (app.rol_actual() = 'produccion');

-- ---------- El sugerido ahora descuenta la merma de sobrantes ----------
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
  select sum(coalesce(s.cantidad_reutilizable, s.cantidad)) q
    from sobrantes s
    join puntos_venta pv on pv.id = p.destino_punto_id
   where s.producto_id = p.producto_id
     and s.punto_venta_id = coalesce(
           pv.punto_anterior_id,
           (select x.id from puntos_venta x where x.punto_anterior_id = pv.id order by x.codigo limit 1),
           pv.id)
     and s.fecha = case when pv.punto_anterior_id is not null then p.fecha else p.fecha - 1 end
) sa on true;

select count(*) as insumos from insumos;
