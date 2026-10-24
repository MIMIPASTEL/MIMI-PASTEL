-- =====================================================================
-- 0013_promociones_y_cierre.sql
-- Promociones combinables entre productos + vista de cierre por turno.
-- =====================================================================

create table if not exists promociones (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  cantidad      numeric(12,3) not null check (cantidad > 0),
  precio        numeric(12,2) not null check (precio >= 0),
  activo        boolean not null default true,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  creado_en     timestamptz not null default now()
);

comment on table promociones is
  'Ej. 3 unidades por S/ 5. La cantidad se puede completar combinando cualquiera de sus productos.';

create table if not exists promocion_productos (
  promocion_id uuid not null references promociones(id) on delete cascade,
  producto_id  uuid not null references productos(id) on delete cascade,
  primary key (promocion_id, producto_id)
);

comment on table promocion_productos is
  'Productos que suman unidades para completar la promocion (se pueden combinar entre si).';

alter table promociones enable row level security;
alter table promocion_productos enable row level security;

drop policy if exists promociones_lectura on promociones;
create policy promociones_lectura on promociones for select to authenticated using (true);

drop policy if exists promociones_admin on promociones;
create policy promociones_admin on promociones for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

drop policy if exists promocion_productos_lectura on promocion_productos;
create policy promocion_productos_lectura on promocion_productos for select to authenticated using (true);

drop policy if exists promocion_productos_admin on promocion_productos;
create policy promocion_productos_admin on promocion_productos for all to authenticated
  using (app.rol_actual() = 'admin') with check (app.rol_actual() = 'admin');

-- ---------- Cierre por turno: unidades + dinero en una sola fila ----------
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

comment on view v_cierre_turno is
  'Todo el cierre de un punto en una fecha: unidades y dinero. '
  'dif_unidades y dif_dinero deben ser 0 para considerar el turno cuadrado.';

-- ---------- Promoción de ejemplo (editable desde Ajustes) ----------
insert into promociones (nombre, cantidad, precio, activo)
select '3 pasteles por S/ 5', 3, 5.00, false
where not exists (select 1 from promociones);

select count(*) as promociones from promociones;
