-- =====================================================================
-- 0024_precios_por_cliente.sql
-- Pedidos: cliente directo vs distribuidor, y presentaciones
-- (unidad, tajada, molde entero) con precio propio.
-- =====================================================================

alter table pedidos add column if not exists tipo_cliente text not null default 'directo';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_tipo_cliente_check') then
    alter table pedidos
      add constraint pedidos_tipo_cliente_check check (tipo_cliente in ('directo', 'distribuidor'));
  end if;
end $$;

create table if not exists presentaciones (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  nombre      text not null,
  es_default  boolean not null default false,
  orden       smallint not null default 1,
  unique (producto_id, nombre)
);

create table if not exists precios_cliente (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references productos(id) on delete cascade,
  presentacion_id uuid not null references presentaciones(id) on delete cascade,
  tipo_cliente    text not null check (tipo_cliente in ('directo', 'distribuidor')),
  precio          numeric(12,2) not null default 0,
  unique (producto_id, presentacion_id, tipo_cliente)
);

alter table pedido_items add column if not exists presentacion_id uuid references presentaciones(id);

alter table presentaciones enable row level security;
alter table precios_cliente enable row level security;

drop policy if exists presentaciones_lectura on presentaciones;
create policy presentaciones_lectura on presentaciones for select to authenticated using (true);
drop policy if exists presentaciones_admin on presentaciones;
create policy presentaciones_admin on presentaciones for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

drop policy if exists precios_cliente_lectura on precios_cliente;
create policy precios_cliente_lectura on precios_cliente for select to authenticated using (true);
drop policy if exists precios_cliente_admin on precios_cliente;
create policy precios_cliente_admin on precios_cliente for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

-- ---------- Presentaciones ----------
-- Todos los productos: unidad
insert into presentaciones (producto_id, nombre, es_default, orden)
select p.id, 'Unidad', true, 1 from productos p
on conflict (producto_id, nombre) do nothing;

-- Torta de chocolate y queques: también por tajada y molde entero
insert into presentaciones (producto_id, nombre, es_default, orden)
select p.id, 'Tajada', false, 2 from productos p where p.codigo in ('T.CH','Q.V','Q.N')
on conflict (producto_id, nombre) do nothing;

insert into presentaciones (producto_id, nombre, es_default, orden)
select p.id, 'Molde entero', false, 3 from productos p where p.codigo in ('T.CH','Q.V','Q.N')
on conflict (producto_id, nombre) do nothing;

-- ---------- Precios iniciales (directo = precio actual de lista) ----------
insert into precios_cliente (producto_id, presentacion_id, tipo_cliente, precio)
select pr.producto_id, pr.id, 'directo', coalesce(l.precio, 0)
  from presentaciones pr
  left join precios l on l.producto_id = pr.producto_id and l.punto_venta_id is null
 where pr.nombre = 'Unidad'
on conflict (producto_id, presentacion_id, tipo_cliente) do nothing;

select count(*) as presentaciones from presentaciones;
select count(*) as precios from precios_cliente;
