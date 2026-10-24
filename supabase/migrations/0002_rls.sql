-- =====================================================================
-- 0002_rls.sql — Seguridad por fila y roles
-- admin: todo · produccion: taller · ventas: punto de venta
-- =====================================================================

-- ---------- Activar RLS en todas las tablas ----------
do $$
declare
  t text;
  tablas text[] := array[
    'perfiles','puntos_venta','productos','precios','insumos','recetas','receta_items',
    'categorias_movimiento','pedidos','pedido_items','requerimientos','requerimiento_items',
    'lotes_produccion','consumos_insumo','mermas','despachos','despacho_items','sobrantes',
    'ventas','venta_items','pagos','movimientos_caja','cuadres','auditoria'
  ];
begin
  foreach t in array tablas loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Lectura para cualquier usuario autenticado ----------
do $$
declare
  t text;
  tablas text[] := array[
    'perfiles','puntos_venta','productos','precios','insumos','recetas','receta_items',
    'categorias_movimiento','pedidos','pedido_items','requerimientos','requerimiento_items',
    'lotes_produccion','consumos_insumo','mermas','despachos','despacho_items','sobrantes',
    'ventas','venta_items','pagos','movimientos_caja','cuadres'
  ];
begin
  foreach t in array tablas loop
    execute format('drop policy if exists %I on public.%I', t || '_lectura', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_lectura', t);
  end loop;
end $$;

-- ---------- Admin: control total ----------
do $$
declare
  t text;
  tablas text[] := array[
    'perfiles','puntos_venta','productos','precios','insumos','recetas','receta_items',
    'categorias_movimiento','pedidos','pedido_items','requerimientos','requerimiento_items',
    'lotes_produccion','consumos_insumo','mermas','despachos','despacho_items','sobrantes',
    'ventas','venta_items','pagos','movimientos_caja','cuadres','auditoria'
  ];
begin
  foreach t in array tablas loop
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (app.rol_actual() = ''admin'') with check (app.rol_actual() = ''admin'')',
      t || '_admin', t);
  end loop;
end $$;

-- ---------- Producción: escribe en el taller ----------
do $$
declare
  t text;
  tablas_insercion text[] := array['lotes_produccion','consumos_insumo','mermas','despachos','despacho_items','sobrantes'];
begin
  foreach t in array tablas_insercion loop
    execute format('drop policy if exists %I on public.%I', t || '_produccion', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (app.rol_actual() = ''produccion'') with check (app.rol_actual() = ''produccion'')',
      t || '_produccion', t);
  end loop;
end $$;

-- Producción puede actualizar el estado del requerimiento (marcarlo producido)
drop policy if exists requerimientos_produccion on requerimientos;
create policy requerimientos_produccion on requerimientos
  for update to authenticated
  using (app.rol_actual() = 'produccion')
  with check (app.rol_actual() = 'produccion');

-- ---------- Ventas: escribe en el punto de venta ----------
do $$
declare
  t text;
  tablas text[] := array['ventas','venta_items','pagos','sobrantes','mermas','movimientos_caja','cuadres'];
begin
  foreach t in array tablas loop
    execute format('drop policy if exists %I on public.%I', t || '_ventas', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (app.rol_actual() = ''ventas'') with check (app.rol_actual() = ''ventas'')',
      t || '_ventas', t);
  end loop;
end $$;

-- Ventas confirma la recepción del despacho (conteo ciego)
drop policy if exists despachos_ventas on despachos;
create policy despachos_ventas on despachos
  for update to authenticated
  using (app.rol_actual() = 'ventas')
  with check (app.rol_actual() = 'ventas');

drop policy if exists despacho_items_ventas on despacho_items;
create policy despacho_items_ventas on despacho_items
  for update to authenticated
  using (app.rol_actual() = 'ventas')
  with check (app.rol_actual() = 'ventas');

-- ---------- Perfiles: cada quien ve y edita el suyo ----------
drop policy if exists perfiles_propio on perfiles;
create policy perfiles_propio on perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and rol = (select rol from perfiles where id = auth.uid()));
-- nota: el with check impide autoascenderse de rol

-- ---------- Auditoría: solo lectura para admin ----------
drop policy if exists auditoria_admin on auditoria;
create policy auditoria_admin on auditoria
  for select to authenticated
  using (app.es_admin());
