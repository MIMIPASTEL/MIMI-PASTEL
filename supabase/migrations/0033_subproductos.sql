-- =====================================================================
-- 0033_subproductos.sql
-- Registro diario de subproductos (planchas, masas, rellenos)
-- =====================================================================

create table if not exists subproductos_dia (
  id        uuid primary key default gen_random_uuid(),
  fecha     date not null,
  clave     text not null,
  producido numeric(12,2) not null default 0,
  usado     numeric(12,2) not null default 0,
  merma     numeric(12,2) not null default 0,
  nota      text,
  unique (fecha, clave)
);

alter table subproductos_dia enable row level security;

drop policy if exists subproductos_lectura on subproductos_dia;
create policy subproductos_lectura on subproductos_dia for select to authenticated using (true);

drop policy if exists subproductos_admin on subproductos_dia;
create policy subproductos_admin on subproductos_dia for all to authenticated
  using (app.rol_actual() in ('admin', 'produccion'))
  with check (app.rol_actual() in ('admin', 'produccion'));

select count(*) as filas from subproductos_dia;
