-- =====================================================================
-- 0032_permisos_reales.sql
-- Cierra la lectura abierta: solo admin y ventas ven dinero.
-- =====================================================================

drop policy if exists ventas_lectura on ventas;
drop policy if exists venta_items_lectura on venta_items;
drop policy if exists pagos_lectura on pagos;
drop policy if exists cuadres_lectura on cuadres;
drop policy if exists movimientos_caja_lectura on movimientos_caja;
drop policy if exists pedidos_lectura on pedidos;
drop policy if exists pedido_items_lectura on pedido_items;
drop policy if exists pagos_pedido_lectura on pagos_pedido;
drop policy if exists parametros_costeo_lectura on parametros_costeo;
drop policy if exists precios_lectura on precios;
drop policy if exists precios_cliente_lectura on precios_cliente;

-- pedidos: solo admin y ventas
drop policy if exists pedidos_ventas on pedidos;
create policy pedidos_ventas on pedidos for all to authenticated
  using (app.rol_actual() in ('admin', 'ventas'))
  with check (app.rol_actual() in ('admin', 'ventas'));

drop policy if exists pedido_items_ventas on pedido_items;
create policy pedido_items_ventas on pedido_items for all to authenticated
  using (app.rol_actual() in ('admin', 'ventas'))
  with check (app.rol_actual() in ('admin', 'ventas'));

drop policy if exists pagos_pedido_ventas on pagos_pedido;
create policy pagos_pedido_ventas on pagos_pedido for all to authenticated
  using (app.rol_actual() in ('admin', 'ventas'))
  with check (app.rol_actual() in ('admin', 'ventas'));

-- precios: admin y ventas
drop policy if exists precios_roles on precios;
create policy precios_roles on precios for select to authenticated
  using (app.rol_actual() in ('admin', 'ventas'));

drop policy if exists precios_cliente_roles on precios_cliente;
create policy precios_cliente_roles on precios_cliente for select to authenticated
  using (app.rol_actual() in ('admin', 'ventas'));

-- las vistas deben respetar el RLS del usuario
alter view v_utilidad_dia set (security_invoker = true);
alter view v_costos_dia set (security_invoker = true);
alter view v_cuadre_dinero set (security_invoker = true);
alter view v_cuadre_unidades set (security_invoker = true);
alter view v_ventas_por_canal set (security_invoker = true);
alter view v_conciliacion set (security_invoker = true);
alter view v_cierre_turno set (security_invoker = true);
alter view v_costo_unitario set (security_invoker = true);
alter view v_pedido_saldo set (security_invoker = true);

select tablename, policyname, cmd
  from pg_policies
 where schemaname = 'public'
   and tablename in ('ventas', 'pedidos', 'precios_cliente')
 order by tablename, policyname;
