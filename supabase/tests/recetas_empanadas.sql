-- Recetas base para las empanadas: 1.8 kg de masa rinde 30 unidades.
-- Solo incluye la masa; el relleno se agrega después desde Ajustes.

insert into recetas (producto_id, version, rendimiento)
select p.id, 1, 30
  from productos p
 where p.codigo in ('E.C', 'E.P')
   and not exists (select 1 from recetas r where r.producto_id = p.id);

insert into receta_items (receta_id, preparacion_id, cantidad)
select r.id, pr.id, 1.8
  from recetas r
  join productos p on p.id = r.producto_id
  cross join preparaciones pr
 where p.codigo in ('E.C', 'E.P')
   and pr.nombre = 'Masa de empanada'
   and not exists (
     select 1 from receta_items x
      where x.receta_id = r.id and x.preparacion_id = pr.id
   );

select p.codigo, r.rendimiento,
       pr.nombre as preparacion, ri.cantidad
  from recetas r
  join productos p on p.id = r.producto_id
  left join receta_items ri on ri.receta_id = r.id
  left join preparaciones pr on pr.id = ri.preparacion_id
 where p.codigo in ('E.C', 'E.P');
