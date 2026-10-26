from pathlib import Path

# ---------- pedidos: el cobro entra a caja ----------
p = Path("components/CobroPedido.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ancla = """    const nuevoPagado = pagado + valor;"""

nuevo = """    await supabase.from("movimientos_caja").insert({
      fecha: new Date().toISOString().slice(0, 10),
      tipo: "ingreso",
      categoria_codigo: pagado > 0 ? "venta" : "adelanto_pedido",
      monto: valor,
      medio,
      concepto: pagado > 0 ? "Saldo de pedido" : "Adelanto de pedido",
      referencia: `pedido:${pedidoId}`,
    });

    const nuevoPagado = pagado + valor;"""

if "movimientos_caja" not in s:
    s = s.replace(ancla, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("pedido a caja:", "movimientos_caja" in s)
