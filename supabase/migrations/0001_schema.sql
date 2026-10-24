-- =====================================================================
-- 0001_schema.sql — Mimi Pastel · esquema núcleo
-- Producción → Despacho → Venta → Cuadre → Utilidad
-- =====================================================================

create extension if not exists pgcrypto;
create schema if not exists app;

-- ---------- Tipos ----------
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'rol_usuario' and n.nspname = 'public') then
    create type public.rol_usuario as enum ('admin', 'produccion', 'ventas');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tipo_punto' and n.nspname = 'public') then
    create type public.tipo_punto as enum ('maxiahorro', 'repartos', 'pedidos', 'institucion');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_pedido' and n.nspname = 'public') then
    create type public.estado_pedido as enum ('borrador', 'confirmado', 'en_produccion', 'despachado', 'entregado', 'cancelado');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_requerimiento' and n.nspname = 'public') then
    create type public.estado_requerimiento as enum ('borrador', 'publicado', 'cerrado');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'origen_item' and n.nspname = 'public') then
    create type public.origen_item as enum ('estimado', 'pedido', 'ajuste');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tipo_merma' and n.nspname = 'public') then
    create type public.tipo_merma as enum ('produccion', 'vitrina', 'devolucion');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'motivo_merma' and n.nspname = 'public') then
    create type public.motivo_merma as enum ('roto', 'quemado', 'vencido', 'contaminado', 'otro');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'medio_pago' and n.nspname = 'public') then
    create type public.medio_pago as enum ('efectivo', 'yape', 'transferencia', 'tarjeta', 'fiado');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'tipo_movimiento' and n.nspname = 'public') then
    create type public.tipo_movimiento as enum ('ingreso', 'salida');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_despacho' and n.nspname = 'public') then
    create type public.estado_despacho as enum ('borrador', 'enviado', 'recibido', 'cerrado');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'estado_cuadre' and n.nspname = 'public') then
    create type public.estado_cuadre as enum ('pendiente', 'ok', 'diferencia_leve', 'diferencia_grave');
  end if;
end $$;

-- ---------- Perfiles (extiende auth.users) ----------
create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  rol         public.rol_usuario not null default 'ventas',
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);
comment on table perfiles is 'Usuario de la app con su rol. Se crea junto con auth.users.';

-- ---------- Catálogos ----------
create table puntos_venta (
  id        uuid primary key default gen_random_uuid(),
  codigo    text not null unique,
  nombre    text not null,
  tipo      public.tipo_punto not null,
  turno     smallint,
  activo    boolean not null default true
);
comment on table puntos_venta is 'Canales/puntos: MAXI1, MAXI2, REPARTOS, PEDIDOS, INSTITUTO.';

create table productos (
  id        uuid primary key default gen_random_uuid(),
  codigo    text unique,
  nombre    text not null,
  unidad    text not null default 'unidad',
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

create table precios (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references productos(id) on delete cascade,
  punto_venta_id  uuid references puntos_venta(id) on delete cascade, -- null = precio general
  precio          numeric(12,2) not null check (precio >= 0),
  vigente_desde   date not null default current_date,
  vigente_hasta   date
);
create index on precios (producto_id, punto_venta_id);

create table insumos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null unique,
  unidad_base   text not null default 'kg',
  stock_minimo  numeric(12,3) not null default 0,
  activo        boolean not null default true
);

create table recetas (
  id             uuid primary key default gen_random_uuid(),
  producto_id    uuid not null references productos(id) on delete cascade,
  version        integer not null default 1,
  rendimiento    numeric(12,3) not null default 1, -- unidades que rinde la receta
  vigente_desde  date not null default current_date,
  notas          text,
  unique (producto_id, version)
);
comment on table recetas is 'Receta versionada: cambiar la receta NO reescribe costos históricos.';

create table receta_items (
  id         uuid primary key default gen_random_uuid(),
  receta_id  uuid not null references recetas(id) on delete cascade,
  insumo_id  uuid not null references insumos(id),
  cantidad   numeric(12,3) not null check (cantidad > 0),
  unique (receta_id, insumo_id)
);

create table categorias_movimiento (
  codigo           text primary key,
  nombre           text not null,
  tipo             public.tipo_movimiento not null,
  afecta_utilidad  boolean not null default true,
  orden            smallint not null default 100
);
comment on table categorias_movimiento is
  'afecta_utilidad=false para retiros, gastos personales, préstamos y compra de insumos (es inventario, no gasto).';

-- ---------- Pedidos ----------
create table pedidos (
  id             uuid primary key default gen_random_uuid(),
  codigo         text unique,
  cliente        text not null,
  telefono       text,
  punto_venta_id uuid references puntos_venta(id),
  fecha_entrega  date not null,
  hora_entrega   time,
  estado         public.estado_pedido not null default 'borrador',
  adelanto       numeric(12,2) not null default 0,
  notas          text,
  creado_por     uuid references perfiles(id),
  creado_en      timestamptz not null default now()
);
create index on pedidos (fecha_entrega, estado);

create table pedido_items (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references pedidos(id) on delete cascade,
  producto_id     uuid not null references productos(id),
  cantidad        numeric(12,3) not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  nota            text
);
comment on column pedido_items.precio_unitario is 'Precio propio del pedido: puede diferir del de lista.';
create index on pedido_items (pedido_id);

-- ---------- Requerimiento de producción ----------
create table requerimientos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null unique,
  estado      public.estado_requerimiento not null default 'borrador',
  notas       text,
  creado_por  uuid references perfiles(id),
  creado_en   timestamptz not null default now()
);

create table requerimiento_items (
  id                 uuid primary key default gen_random_uuid(),
  requerimiento_id   uuid not null references requerimientos(id) on delete cascade,
  producto_id        uuid not null references productos(id),
  cantidad           numeric(12,3) not null check (cantidad >= 0),
  destino_punto_id   uuid references puntos_venta(id),
  destino_pedido_id  uuid references pedidos(id) on delete cascade,
  origen             public.origen_item not null default 'estimado',
  constraint destino_obligatorio check (destino_punto_id is not null or destino_pedido_id is not null)
);
create index on requerimiento_items (requerimiento_id);
create index on requerimiento_items (destino_pedido_id);

-- ---------- Producción ----------
create table lotes_produccion (
  id               uuid primary key default gen_random_uuid(),
  fecha            date not null default current_date,
  producto_id      uuid not null references productos(id),
  cantidad_producida numeric(12,3) not null check (cantidad_producida > 0),
  costo_insumos    numeric(12,2) not null default 0,
  costo_mano_obra  numeric(12,2) not null default 0,
  costo_total      numeric(12,2) generated always as (costo_insumos + costo_mano_obra) stored,
  costo_unitario   numeric(12,4) generated always as
                     ((costo_insumos + costo_mano_obra) / nullif(cantidad_producida, 0)) stored,
  lote_padre_id    uuid references lotes_produccion(id),
  punto_venta_id   uuid references puntos_venta(id),
  requerimiento_item_id uuid references requerimiento_items(id),
  creado_por       uuid references perfiles(id),
  creado_en        timestamptz not null default now()
);
comment on column lotes_produccion.lote_padre_id is
  'Si el lote nace de sobrantes del día anterior, apunta al lote original y HEREDA su costo (no se re-costea).';
create index on lotes_produccion (fecha, producto_id);

create table consumos_insumo (
  id             uuid primary key default gen_random_uuid(),
  lote_id        uuid not null references lotes_produccion(id) on delete cascade,
  insumo_id      uuid not null references insumos(id),
  cantidad       numeric(12,3) not null check (cantidad > 0),
  costo_unitario numeric(12,4) not null default 0,
  subtotal       numeric(12,2) generated always as (cantidad * costo_unitario) stored
);
create index on consumos_insumo (lote_id);
create index on consumos_insumo (insumo_id);

create table mermas (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  producto_id    uuid not null references productos(id),
  lote_id        uuid references lotes_produccion(id),
  punto_venta_id uuid references puntos_venta(id), -- null = merma en producción
  cantidad       numeric(12,3) not null check (cantidad > 0),
  tipo           public.tipo_merma not null,
  motivo         public.motivo_merma not null default 'otro',
  foto_url       text,
  nota           text,
  usuario_id     uuid references perfiles(id),
  aprobado_por   uuid references perfiles(id),
  aprobado_en    timestamptz,
  creado_en      timestamptz not null default now()
);
create index on mermas (fecha, punto_venta_id);

-- ---------- Despacho ----------
create table despachos (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  punto_venta_id uuid not null references puntos_venta(id),
  turno          smallint,
  estado         public.estado_despacho not null default 'borrador',
  enviado_por    uuid references perfiles(id),
  recibido_por   uuid references perfiles(id),
  enviado_en     timestamptz,
  recibido_en    timestamptz,
  unique (fecha, punto_venta_id, turno)
);

create table despacho_items (
  id                 uuid primary key default gen_random_uuid(),
  despacho_id        uuid not null references despachos(id) on delete cascade,
  producto_id        uuid not null references productos(id),
  cantidad_enviada   numeric(12,3) not null default 0 check (cantidad_enviada >= 0),
  cantidad_recibida  numeric(12,3) check (cantidad_recibida >= 0),
  unique (despacho_id, producto_id)
);
comment on column despacho_items.cantidad_recibida is
  'Conteo ciego: la vendedora lo declara sin ver cantidad_enviada.';

-- ---------- Sobrantes (cierre del día, pasan al siguiente) ----------
create table sobrantes (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  punto_venta_id uuid not null references puntos_venta(id),
  producto_id    uuid not null references productos(id),
  cantidad       numeric(12,3) not null check (cantidad >= 0),
  lote_id        uuid references lotes_produccion(id),
  registrado_por uuid references perfiles(id),
  creado_en      timestamptz not null default now(),
  unique (fecha, punto_venta_id, producto_id)
);

-- ---------- Ventas ----------
create table ventas (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null default current_date,
  punto_venta_id uuid not null references puntos_venta(id),
  turno          smallint,
  usuario_id     uuid references perfiles(id),
  total          numeric(12,2) not null default 0,
  creado_en      timestamptz not null default now()
);
create index on ventas (fecha, punto_venta_id);

create table venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references ventas(id) on delete cascade,
  producto_id     uuid not null references productos(id),
  cantidad        numeric(12,3) not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  lote_id         uuid references lotes_produccion(id),
  subtotal        numeric(12,2) generated always as (cantidad * precio_unitario) stored
);

create table pagos (
  id             uuid primary key default gen_random_uuid(),
  venta_id       uuid references ventas(id) on delete cascade,
  punto_venta_id uuid references puntos_venta(id),
  fecha          date not null default current_date,
  medio          public.medio_pago not null,
  monto          numeric(12,2) not null check (monto >= 0),
  referencia     text,
  creado_en      timestamptz not null default now()
);

-- ---------- Caja ----------
create table movimientos_caja (
  id               uuid primary key default gen_random_uuid(),
  fecha            date not null default current_date,
  tipo             public.tipo_movimiento not null,
  categoria_codigo text not null references categorias_movimiento(codigo),
  monto            numeric(12,2) not null check (monto > 0),
  medio            public.medio_pago not null default 'efectivo',
  turno            smallint,
  concepto         text,
  referencia       text,
  creado_por       uuid references perfiles(id),
  creado_en        timestamptz not null default now()
);
create index on movimientos_caja (fecha, tipo);

-- ---------- Cuadre ----------
create table cuadres (
  id                uuid primary key default gen_random_uuid(),
  fecha             date not null,
  punto_venta_id    uuid not null references puntos_venta(id),
  turno             smallint,
  unidades_esperadas numeric(12,3) not null default 0,
  unidades_contadas  numeric(12,3) not null default 0,
  dinero_esperado   numeric(12,2) not null default 0,
  dinero_contado    numeric(12,2) not null default 0,
  diferencia_unidades numeric(12,3) generated always as (unidades_contadas - unidades_esperadas) stored,
  diferencia_dinero   numeric(12,2) generated always as (dinero_contado - dinero_esperado) stored,
  estado            public.estado_cuadre not null default 'pendiente',
  cerrado_por       uuid references perfiles(id),
  cerrado_en        timestamptz,
  nota              text,
  unique (fecha, punto_venta_id, turno)
);

-- ---------- Auditoría ----------
create table auditoria (
  id          bigserial primary key,
  tabla       text not null,
  registro_id text,
  accion      text not null,
  usuario_id  uuid,
  datos       jsonb,
  fecha       timestamptz not null default now()
);
create index on auditoria (fecha desc);

-- ---------- Función: rol del usuario actual ----------
create or replace function app.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select rol from perfiles where id = auth.uid() and activo
$$;

create or replace function app.es_admin()
returns boolean
language sql
stable
as $$
  select coalesce(app.rol_actual() = 'admin', false)
$$;

grant usage on schema app to authenticated, anon;
