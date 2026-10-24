-- =====================================================================
-- 0012_orden_puntos.sql
-- Orden y clientes fijos actuales de la semana.
-- =====================================================================

alter table puntos_venta add column if not exists orden smallint not null default 100;

comment on column puntos_venta.orden is
  'Orden de aparicion en la parrilla de programacion. 1 = primero.';

-- San Jerónimo es el mismo cliente que figuraba como S.J
update puntos_venta
   set codigo = 'SAN JERONIMO', nombre = 'San Jerónimo'
 where codigo = 'S-J';

-- Cliente nuevo
insert into puntos_venta (codigo, nombre, tipo, es_fijo)
values ('PUENTE', 'Puente', 'repartos', true)
on conflict (codigo) do nothing;

-- Fijos de la semana (en el orden que indicó la dueña)
update puntos_venta set es_fijo = true, orden = 1  where codigo = 'MAXI1';
update puntos_venta set es_fijo = true, orden = 2  where codigo = 'MAXI2';
update puntos_venta set es_fijo = true, orden = 3  where codigo = 'V-RAUL';
update puntos_venta set es_fijo = true, orden = 4  where codigo = 'BOLIVAR';
update puntos_venta set es_fijo = true, orden = 5  where codigo = 'SAN JERONIMO';
update puntos_venta set es_fijo = true, orden = 6  where codigo = 'JASON';
update puntos_venta set es_fijo = true, orden = 7  where codigo = 'ENOC';
update puntos_venta set es_fijo = true, orden = 8  where codigo = 'MARQUEZ';
update puntos_venta set es_fijo = true, orden = 9  where codigo = 'ALEXANDER';
update puntos_venta set es_fijo = true, orden = 10 where codigo = 'CARLA';
update puntos_venta set es_fijo = true, orden = 11 where codigo = 'PUENTE';
update puntos_venta set es_fijo = true, orden = 12 where codigo = 'ZAVALA';

-- Los que dejan de ser fijos (aparecen solo si se activan)
update puntos_venta set es_fijo = false, orden = 101
 where codigo in ('ELITA', 'ENOELLIS', 'CHURRO', 'TIENDAS', 'YANINA');
update puntos_venta set orden = 90 where codigo = 'REPARTOS';

create index if not exists puntos_orden_idx on puntos_venta (orden, codigo);

select orden, codigo, es_fijo
  from puntos_venta
 where tipo in ('maxiahorro','repartos')
 order by orden, codigo;
