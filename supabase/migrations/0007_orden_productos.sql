-- =====================================================================
-- 0007_orden_productos.sql
-- Orden de columnas igual al formato de la hoja SGMP.
-- =====================================================================

alter table productos add column if not exists orden smallint not null default 100;

comment on column productos.orden is
  'Orden de aparición en parrillas y listas. 1 = primera columna (E.C).';

update productos set orden = 1  where codigo = 'E.C';
update productos set orden = 2  where codigo = 'E.P';
update productos set orden = 3  where codigo = 'ES.C';
update productos set orden = 4  where codigo = 'ES.P';
update productos set orden = 5  where codigo = 'HD';
update productos set orden = 6  where codigo = 'MZA';
update productos set orden = 7  where codigo = 'PINA';
update productos set orden = 8  where codigo = 'QUESO';
update productos set orden = 9  where codigo = 'T.M';
update productos set orden = 10 where codigo = 'T.F';
update productos set orden = 11 where codigo = 'ALF';
update productos set orden = 12 where codigo = 'MH';
update productos set orden = 13 where codigo = 'CONO';
update productos set orden = 14 where codigo = 'T.CH';
update productos set orden = 15 where codigo = 'PION';
update productos set orden = 16 where codigo = 'Q.V';
update productos set orden = 17 where codigo = 'Q.N';
update productos set orden = 18 where codigo = 'BUD';

create index if not exists productos_orden_idx on productos (orden, codigo);

select orden, codigo, nombre from productos order by orden;
