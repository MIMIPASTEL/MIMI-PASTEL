-- Corrige nombres con acentos (se enviaron con codificación incorrecta)
update productos set nombre = 'Pastel de piña'   where codigo = 'PINA';
update productos set nombre = 'Budín'            where codigo = 'BUD';

update puntos_venta set nombre = 'Bolívar'       where codigo = 'BOLIVAR';
update puntos_venta set nombre = 'Víctor Raúl'   where codigo = 'V-RAUL';
update puntos_venta set nombre = 'Márquez'       where codigo = 'MARQUEZ';

select codigo, nombre, length(nombre) as len,
       nombre like '%ñ%' or nombre like '%í%' or nombre like '%á%' as tiene_acento
  from productos where codigo in ('PINA','BUD')
union all
select codigo, nombre, length(nombre),
       nombre like '%í%' or nombre like '%á%'
  from puntos_venta where codigo in ('BOLIVAR','V-RAUL','MARQUEZ');
