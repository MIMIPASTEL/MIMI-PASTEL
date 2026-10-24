-- =====================================================================
-- 0016_preparaciones.sql
-- Preparaciones base (masa, relleno, crema) que se elaboran en volumen
-- y luego se consumen en porciones dentro de la receta de un producto.
--
--   Masa de empanada: 10 kg harina + 4.1 kg manteca + 1.6 kg azucar
--                   + 0.1 kg sal + 2.4 kg agua  =  18.2 kg
--   Empanada (30 un): 1.8 kg de masa
-- =====================================================================

create table if not exists preparaciones (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  rendimiento numeric(12,3) not null check (rendimiento > 0),
  unidad     text not null default 'kg',
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

comment on table preparaciones is
  'Elaboraciones intermedias: masa, relleno, crema. Se producen en volumen y luego se usan por porciones.';

create table if not exists preparacion_items (
  preparacion_id uuid not null references preparaciones(id) on delete cascade,
  insumo_id      uuid not null references insumos(id),
  cantidad       numeric(12,3) not null check (cantidad > 0),
  primary key (preparacion_id, insumo_id)
);

alter table receta_items add column if not exists preparacion_id uuid references preparaciones(id);
alter table receta_items alter column insumo_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'receta_items_origen') then
    alter table receta_items
      add constraint receta_items_origen check (insumo_id is not null or preparacion_id is not null);
  end if;
end $$;

alter table preparaciones enable row level security;
alter table preparacion_items enable row level security;

drop policy if exists preparaciones_lectura on preparaciones;
create policy preparaciones_lectura on preparaciones for select to authenticated using (true);
drop policy if exists preparaciones_admin on preparaciones;
create policy preparaciones_admin on preparaciones for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

drop policy if exists preparacion_items_lectura on preparacion_items;
create policy preparacion_items_lectura on preparacion_items for select to authenticated using (true);
drop policy if exists preparacion_items_admin on preparacion_items;
create policy preparacion_items_admin on preparacion_items for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

-- ---------- Insumos que faltaban ----------
insert into insumos (nombre, unidad_base) values ('Sal', 'kg'), ('Agua', 'kg')
on conflict (nombre) do nothing;

-- ---------- Masa de empanada (cargada con los datos reales) ----------
insert into preparaciones (nombre, rendimiento, unidad)
select 'Masa de empanada', 18.2, 'kg'
where not exists (select 1 from preparaciones where nombre = 'Masa de empanada');

insert into preparacion_items (preparacion_id, insumo_id, cantidad)
select pr.id, i.id, v.cantidad
  from preparaciones pr
  cross join (values ('Harina', 10.0), ('Manteca', 4.1), ('Azúcar', 1.6), ('Sal', 0.1), ('Agua', 2.4)) as v(nombre, cantidad)
  join insumos i on i.nombre = v.nombre
 where pr.nombre = 'Masa de empanada'
on conflict (preparacion_id, insumo_id) do update set cantidad = excluded.cantidad;

select pr.nombre, pr.rendimiento, pr.unidad,
       (select count(*) from preparacion_items x where x.preparacion_id = pr.id) as insumos
  from preparaciones pr;
