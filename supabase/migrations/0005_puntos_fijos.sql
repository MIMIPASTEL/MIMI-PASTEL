-- =====================================================================
-- 0005_puntos_fijos.sql
-- Distingue clientes de reparto fijos (lunes a viernes) de eventuales.
-- =====================================================================

alter table puntos_venta
  add column if not exists es_fijo boolean not null default false,
  add column if not exists dias_semana smallint[] not null default '{1,2,3,4,5}';

comment on column puntos_venta.es_fijo is
  'true = cliente fijo de reparto (se programa de lunes a viernes). false = eventual.';
comment on column puntos_venta.dias_semana is
  'Días ISO en que se atiende: 1=lunes … 7=domingo.';

-- MAXIAHORRO y pedidos siempre fijos
update puntos_venta set es_fijo = true where tipo in ('maxiahorro', 'pedidos');

-- Clientes de reparto recurrentes (aparecen en >= 25% de los días hábiles del histórico)
update puntos_venta set es_fijo = true
 where codigo in ('BOLIVAR', 'V-RAUL', 'S-J', 'ZAVALA', 'TIENDAS', 'ELITA', 'ENOELLIS', 'CHURRO');

-- El resto queda como eventual
update puntos_venta set es_fijo = false
 where tipo = 'repartos' and codigo not in ('BOLIVAR', 'V-RAUL', 'S-J', 'ZAVALA', 'TIENDAS', 'ELITA', 'ENOELLIS', 'CHURRO');

select codigo, tipo, es_fijo,
       (select count(*) from puntos_venta p2 where p2.es_fijo) as total_fijos
  from puntos_venta
 order by es_fijo desc, codigo;
