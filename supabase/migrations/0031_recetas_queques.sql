update insumos set precio_unitario = 8.00 where nombre = 'Esencia de vainilla';

-- ---------- preparaciones base (1 molde) ----------
insert into preparaciones (nombre, rendimiento, unidad)
select v.nombre, 1, 'molde'
  from (values
    ('Queque vainilla (1 molde)'),
    ('Queque naranja (1 molde)'),
    ('Torta chocolate kilo (1 molde)'),
    ('Pionono (1 molde)')
  ) as v(nombre)
 where not exists (select 1 from preparaciones p where p.nombre = v.nombre);

delete from preparacion_items
 where preparacion_id in (
   select id from preparaciones
    where nombre in ('Queque vainilla (1 molde)','Queque naranja (1 molde)','Torta chocolate kilo (1 molde)','Pionono (1 molde)')
 );

insert into preparacion_items (preparacion_id, insumo_id, cantidad)
select pr.id, i.id, v.cantidad
  from preparaciones pr
  join (values
    -- queque vainilla, 1 molde
    ('Queque vainilla (1 molde)', 'Premezcla', 0.800),
    ('Queque vainilla (1 molde)', 'Huevo', 0.320),
    ('Queque vainilla (1 molde)', 'Aceite', 0.240),
    ('Queque vainilla (1 molde)', 'Agua', 0.192),
    ('Queque vainilla (1 molde)', 'Esencia de vainilla', 0.010),
    -- queque naranja, 1 molde
    ('Queque naranja (1 molde)', 'Premezcla', 1.000),
    ('Queque naranja (1 molde)', 'Huevo', 0.450),
    ('Queque naranja (1 molde)', 'Aceite', 0.200),
    ('Queque naranja (1 molde)', 'Mantequilla', 0.200),
    ('Queque naranja (1 molde)', 'Naranja', 0.500),
    -- torta de chocolate 1 kg
    ('Torta chocolate kilo (1 molde)', 'Harina', 0.800),
    ('Torta chocolate kilo (1 molde)', 'Cocoa', 0.080),
    ('Torta chocolate kilo (1 molde)', 'Polvo de hornear', 0.040),
    ('Torta chocolate kilo (1 molde)', 'Bicarbonato', 0.016),
    ('Torta chocolate kilo (1 molde)', 'Sal', 0.004),
    ('Torta chocolate kilo (1 molde)', 'Agua', 0.800),
    ('Torta chocolate kilo (1 molde)', 'Esencia de vainilla', 0.040),
    ('Torta chocolate kilo (1 molde)', 'Huevo', 0.200),
    ('Torta chocolate kilo (1 molde)', 'Aceite', 0.208),
    ('Torta chocolate kilo (1 molde)', 'Azúcar', 0.800),
    -- pionono
    ('Pionono (1 molde)', 'Premezcla', 1.000),
    ('Pionono (1 molde)', 'Huevo', 0.700),
    ('Pionono (1 molde)', 'Agua', 0.200),
    ('Pionono (1 molde)', 'Emulsionante', 0.010),
    ('Pionono (1 molde)', 'Polvo de hornear', 0.005)
  ) as v(preparacion, insumo, cantidad) on v.preparacion = pr.nombre
  join insumos i on i.nombre = v.insumo;

-- ---------- recetas de producto ----------
insert into recetas (producto_id, version, rendimiento)
select p.id, 1, 1
  from productos p
 where p.codigo in ('Q.V','Q.N','T.CH.1K','PION')
   and not exists (select 1 from recetas r where r.producto_id = p.id);

delete from receta_items
 where receta_id in (
   select r.id from recetas r join productos p on p.id = r.producto_id
    where p.codigo in ('Q.V','Q.N','T.CH.1K','PION')
 );

insert into receta_items (receta_id, preparacion_id, cantidad)
select r.id, pr.id, 1
  from recetas r
  join productos p on p.id = r.producto_id
  join (values
    ('Q.V', 'Queque vainilla (1 molde)'),
    ('Q.N', 'Queque naranja (1 molde)'),
    ('T.CH.1K', 'Torta chocolate kilo (1 molde)'),
    ('PION', 'Pionono (1 molde)')
  ) as m(codigo, preparacion) on m.codigo = p.codigo
  join preparaciones pr on pr.nombre = m.preparacion;

select codigo,
       round(costo_insumos::numeric, 2) as insumos,
       round(costo_unitario::numeric, 2) as costo_total
  from v_costo_unitario
 where codigo in ('Q.V','Q.N','T.CH.1K','PION','BUD')
 order by codigo;
