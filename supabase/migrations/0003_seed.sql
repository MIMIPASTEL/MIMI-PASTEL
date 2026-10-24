-- =====================================================================
-- 0003_seed.sql — Datos base de Mimi Pastel
-- Idempotente: se puede correr varias veces
-- =====================================================================

-- ---------- Puntos de venta / canales ----------
insert into puntos_venta (codigo, nombre, tipo, turno) values
  ('MAXI1',     'MAXIAHORRO — Turno 1', 'maxiahorro', 1),
  ('MAXI2',     'MAXIAHORRO — Turno 2', 'maxiahorro', 2),
  ('REPARTOS',  'Repartos',             'repartos',   null),
  ('PEDIDOS',   'Pedidos',              'pedidos',    null),
  ('INSTITUTO', 'Instituto / Colegios', 'institucion', null)
on conflict (codigo) do nothing;

-- ---------- Categorías de caja ----------
-- afecta_utilidad = false en: retiros, gastos personales, préstamos y compra de
-- insumos (esta última es inventario, su costo entra por el lote de producción).
insert into categorias_movimiento (codigo, nombre, tipo, afecta_utilidad, orden) values
  ('venta',            'Venta',                       'ingreso', false, 10),
  ('adelanto_pedido',  'Adelanto de pedido',          'ingreso', false, 20),
  ('prestamo_recibido','Préstamo recibido',           'ingreso', false, 30),
  ('aporte_socio',     'Aporte de capital',           'ingreso', false, 40),
  ('otro_ingreso',     'Otro ingreso',                'ingreso', true,  90),

  ('compra_insumo',    'Compra de insumos',           'salida',  false, 10),
  ('planilla',         'Sueldos y jornales',          'salida',  true,  20),
  ('gasto_negocio',    'Gasto del negocio',           'salida',  true,  30),
  ('movilidad',        'Movilidad y transporte',      'salida',  true,  40),
  ('servicios',        'Luz, agua, internet, gas',    'salida',  true,  50),
  ('pago_sunat',       'SUNAT / impuestos',           'salida',  true,  60),
  ('otro_gasto',       'Otro gasto del negocio',      'salida',  true,  70),
  ('gasto_personal',   'Gasto personal',              'salida',  false, 80),
  ('retiro',           'Retiro de la dueña',          'salida',  false, 90),
  ('pago_prestamo',    'Pago de préstamo',            'salida',  false, 95)
on conflict (codigo) do nothing;

-- ---------- Insumos habituales ----------
insert into insumos (nombre, unidad_base, stock_minimo) values
  ('Harina',      'kg', 25),
  ('Manteca',     'kg', 10),
  ('Azúcar',      'kg', 15),
  ('Carne',       'kg', 5),
  ('Pollo',       'kg', 5),
  ('Frutas',      'kg', 5),
  ('Queso',       'kg', 3),
  ('Manjar',      'kg', 3),
  ('Cocoa',       'kg', 2),
  ('Aceite',      'l',  5),
  ('Empaques',    'unidad', 200),
  ('Gas',         'balon', 1)
on conflict (nombre) do nothing;
