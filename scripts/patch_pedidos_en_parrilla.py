"""Pedidos como filas en la parrilla + fix del borrado de requerimiento."""
from pathlib import Path

p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. FIX: al guardar solo se borran las filas de clientes, NO las de pedidos
viejo_delete = 'const { error: e1 } = await supabase.from("requerimiento_items").delete().eq("requerimiento_id", reqId);'
nuevo_delete = 'const { error: e1 } = await supabase\n      .from("requerimiento_items")\n      .delete()\n      .eq("requerimiento_id", reqId)\n      .is("destino_pedido_id", null);'
if viejo_delete not in s:
    raise SystemExit("no se encontro el delete")
s = s.replace(viejo_delete, nuevo_delete, 1)

# 2. helper + totales que incluyen pedidos
viejo_totales = """  const totalCol = (prodId: string) =>
    visibles.reduce((a, pv) => a + Number(celdas[clave(pv.id, prodId)] || 0), 0);

  const granTotal = useMemo(
    () => visibles.reduce((a, pv) => a + totalFila(pv.id), 0),
    [visibles, productos, celdas],
  );"""

nuevo_totales = """  const totalPedido = (p: any) =>
    (p.pedido_items ?? []).reduce((a: number, it: any) => a + Number(it.cantidad), 0);

  const cantidadPedido = (p: any, prodId: string) =>
    (p.pedido_items ?? [])
      .filter((it: any) => it.producto_id === prodId)
      .reduce((a: number, it: any) => a + Number(it.cantidad), 0);

  const totalCol = (prodId: string) =>
    visibles.reduce((a, pv) => a + Number(celdas[clave(pv.id, prodId)] || 0), 0) +
    pedidosDia.reduce((a, p) => a + cantidadPedido(p, prodId), 0);

  const granTotal = useMemo(
    () =>
      visibles.reduce((a, pv) => a + totalFila(pv.id), 0) +
      pedidosDia.reduce((a, p) => a + totalPedido(p), 0),
    [visibles, productos, celdas, pedidosDia],
  );"""

if viejo_totales not in s:
    raise SystemExit("no se encontraron los totales")
s = s.replace(viejo_totales, nuevo_totales, 1)

# 3. filas de pedidos dentro de la parrilla
ancla = """              <tr>
                <td className="sticky"><strong>Total</strong></td>"""
if ancla not in s:
    raise SystemExit("no se encontro la fila de totales")

filas_pedido = """              {pedidosDia.map((p) => (
                <tr key={`ped-${p.id}`} style={{ background: "#fdf4f7" }}>
                  <td className="sticky" title="Pedido del día">
                    🎂 {p.cliente}
                  </td>
                  {productos.map((pr) => {
                    const q = cantidadPedido(p, pr.id);
                    return (
                      <td key={pr.id} className="num">
                        {q > 0 ? q : ""}
                      </td>
                    );
                  })}
                  <td className="num">
                    <strong>{totalPedido(p)}</strong>
                  </td>
                </tr>
              ))}
"""
s = s.replace(ancla, filas_pedido + ancla, 1)

# 4. leyenda
s = s.replace(
    "Toca la <strong>×</strong> de un cliente cuando hoy no pidió: se quita de la parrilla sin borrar nada.",
    "Toca la <strong>×</strong> de un cliente cuando hoy no pidió. Las filas con 🎂 son pedidos: se editan en la pestaña Pedidos.",
    1,
)

p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig)
print("delete scoped:", '.is("destino_pedido_id", null)' in s)
print("filas pedido:", "🎂 {p.cliente}" in s)
