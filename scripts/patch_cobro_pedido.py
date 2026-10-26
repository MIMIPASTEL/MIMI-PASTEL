from pathlib import Path

# 1. migrar adelantos existentes a pagos_pedido
sql = """insert into pagos_pedido (pedido_id, fecha, tipo, medio, monto)
select p.id, coalesce(p.fecha_pedido, current_date), 'adelanto', 'efectivo', p.adelanto
  from pedidos p
 where coalesce(p.adelanto, 0) > 0
   and not exists (select 1 from pagos_pedido x where x.pedido_id = p.id);
"""
Path("supabase/migrations/0028_adelantos_a_pagos.sql").write_text(sql, encoding="utf-8")
print("migracion 0028 escrita")

# 2. componente en la tarjeta del pedido
p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "CobroPedido" not in s:
    s = s.replace(
        'import PedidoDetalle from "@/components/PedidoDetalle";',
        'import PedidoDetalle from "@/components/PedidoDetalle";\nimport CobroPedido from "@/components/CobroPedido";',
        1,
    )

    s = s.replace(
        """                  <button className="btn btn-sm" onClick={() => enviarWhatsapp(p)}>
                    WhatsApp
                  </button>""",
        """                  <button className="btn btn-sm" onClick={() => enviarWhatsapp(p)}>
                    WhatsApp
                  </button>
                  <CobroPedido
                    pedidoId={p.id}
                    totalPedido={(p.pedido_items ?? []).reduce(
                      (a: number, it: any) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0),
                      0,
                    )}
                    onSaved={cargar}
                  />""",
        1,
    )

p.write_text(s, encoding="utf-8")
print("pedidos:", s != orig, "| cobro:", "CobroPedido" in s)
