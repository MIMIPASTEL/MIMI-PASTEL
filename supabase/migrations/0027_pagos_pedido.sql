-- =====================================================================
-- 0027_pagos_pedido.sql
-- Cobros de pedidos: adelanto y saldo (efectivo, Yape, transferencia)
-- =====================================================================

create table if not exists pagos_pedido (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null references pedidos(id) on delete cascade,
  fecha      date not null default current_date,
  tipo       text not null default 'adelanto' check (tipo in ('adelanto', 'saldo')),
  medio      text not null check (medio in ('efectivo', 'yape', 'transferencia')),
  monto      numeric(12,2) not null check (monto > 0),
  creado_en  timestamptz not null default now()
);

create index if not exists pagos_pedido_pedido_idx on pagos_pedido (pedido_id);

alter table pagos_pedido enable row level security;

drop policy if exists pagos_pedido_lectura on pagos_pedido;
create policy pagos_pedido_lectura on pagos_pedido for select to authenticated using (true);

drop policy if exists pagos_pedido_admin on pagos_pedido;
create policy pagos_pedido_admin on pagos_pedido for all to authenticated
  using (app.rol_actual() in ('admin', 'ventas'))
  with check (app.rol_actual() in ('admin', 'ventas'));

-- vista con el total pagado y el saldo de cada pedido
create or replace view v_pedido_saldo as
with t as (
  select p.id as pedido_id,
         coalesce(sum(i.cantidad * i.precio_unitario), 0) as total
    from pedidos p
    left join pedido_items i on i.pedido_id = p.id
   group by p.id
), pag as (
  select pedido_id, coalesce(sum(monto), 0) as pagado
    from pagos_pedido
   group by pedido_id
)
select t.pedido_id,
       t.total,
       coalesce(pag.pagado, 0) as pagado,
       greatest(t.total - coalesce(pag.pagado, 0), 0) as saldo
  from t
  left join pag on pag.pedido_id = t.pedido_id;

select count(*) as pedidos_con_saldo from v_pedido_saldo;
