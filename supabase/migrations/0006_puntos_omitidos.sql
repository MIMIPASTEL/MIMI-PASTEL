-- =====================================================================
-- 0006_puntos_omitidos.sql
-- "Hoy no pidió": quita un cliente de la parrilla de una fecha concreta
-- sin borrar su configuración ni su historial.
-- =====================================================================

create table if not exists puntos_omitidos (
  fecha           date not null,
  punto_venta_id  uuid not null references puntos_venta(id) on delete cascade,
  motivo          text,
  creado_por      uuid references perfiles(id),
  creado_en       timestamptz not null default now(),
  primary key (fecha, punto_venta_id)
);

comment on table puntos_omitidos is
  'Clientes fijos que en una fecha determinada no hicieron pedido. Se excluyen de la programación.';

alter table puntos_omitidos enable row level security;

drop policy if exists puntos_omitidos_lectura on puntos_omitidos;
create policy puntos_omitidos_lectura on puntos_omitidos
  for select to authenticated using (true);

drop policy if exists puntos_omitidos_admin on puntos_omitidos;
create policy puntos_omitidos_admin on puntos_omitidos
  for all to authenticated
  using (app.rol_actual() = 'admin')
  with check (app.rol_actual() = 'admin');

drop policy if exists puntos_omitidos_produccion on puntos_omitidos;
create policy puntos_omitidos_produccion on puntos_omitidos
  for all to authenticated
  using (app.rol_actual() = 'produccion')
  with check (app.rol_actual() = 'produccion');

select count(*) as omitidos from puntos_omitidos;
