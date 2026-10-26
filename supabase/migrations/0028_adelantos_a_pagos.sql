insert into pagos_pedido (pedido_id, fecha, tipo, medio, monto)
select p.id, coalesce((p.creado_en)::date, current_date), 'adelanto', 'efectivo', p.adelanto
  from pedidos p
 where coalesce(p.adelanto, 0) > 0
   and not exists (select 1 from pagos_pedido x where x.pedido_id = p.id);
