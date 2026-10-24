from pathlib import Path

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")

roto = """  async function eliminarPedido(p: Pedido) {
    setErr(null);
    setMsg(null);
    await quitarPedidoDeProduccion(p.id);
    const { error } = await supabase.from(pedidos).delete().eq(id, p.id);
    if (error) return setErr(error.message);
    setMsg(Pedido de  eliminado.);
    cargar();
  }
"""

bueno = """  async function eliminarPedido(p: Pedido) {
    setErr(null);
    setMsg(null);
    await quitarPedidoDeProduccion(p.id);
    const { error } = await supabase.from(\"pedidos\").delete().eq(\"id\", p.id);
    if (error) return setErr(error.message);
    setMsg(`Pedido de ${p.cliente} eliminado.`);
    cargar();
  }
"""

if roto not in s:
    raise SystemExit("no se encontro el bloque roto")

s = s.replace(roto, bueno, 1)
p.write_text(s, encoding="utf-8")
print("reparado")
