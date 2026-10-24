"""Pedidos: especificaciones por linea y detalle desplegable."""
from pathlib import Path

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. import del componente
s = s.replace(
    'import { sincronizarPedido } from "@/lib/pedidos";',
    'import { sincronizarPedido } from "@/lib/pedidos";\nimport PedidoDetalle from "@/components/PedidoDetalle";',
    1,
)

# 2. tipo de linea con nota
s = s.replace(
    "type Linea = { producto_id: string; cantidad: string; precio: string };",
    "type Linea = { producto_id: string; cantidad: string; precio: string; nota: string };",
    1,
)

# 3. estados iniciales y reinicios
s = s.replace(
    'useState<Linea[]>([{ producto_id: "", cantidad: "", precio: "" }])',
    'useState<Linea[]>([{ producto_id: "", cantidad: "", precio: "", nota: "" }])',
)
s = s.replace(
    'setLineas([{ producto_id: "", cantidad: "", precio: "" }]);',
    'setLineas([{ producto_id: "", cantidad: "", precio: "", nota: "" }]);',
    1,
)
s = s.replace(
    '[...l, { producto_id: "", cantidad: "", precio: "" }]',
    '[...l, { producto_id: "", cantidad: "", precio: "", nota: "" }]',
    1,
)

# 4. guardar la nota
s = s.replace(
    """        producto_id: l.producto_id,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio || 0),
      })),""",
    """        producto_id: l.producto_id,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio || 0),
        nota: l.nota?.trim() ? l.nota.trim() : null,
      })),""",
    1,
)

# 5. mas campos en la consulta
s = s.replace(
    '.select("id, cliente, fecha_entrega, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, productos(nombre))")',
    '.select("id, cliente, telefono, notas, fecha_entrega, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))")',
    1,
)

# 6. fila de producto con campo de indicaciones
viejo_fila = """        {lineas.map((l, i) => (
          <div key={i} className="grid grid-3" style={{ marginBottom: 8 }}>
            <select className="input" value={l.producto_id} onChange={(e) => setLinea(i, "producto_id", e.target.value)}>
              <option value="">Producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <input
              className="input num"
              type="number"
              min="0"
              step="1"
              placeholder="Cantidad"
              value={l.cantidad}
              onChange={(e) => setLinea(i, "cantidad", e.target.value)}
            />
            <input
              className="input num"
              type="number"
              min="0"
              step="0.1"
              placeholder="Precio unit."
              value={l.precio}
              onChange={(e) => setLinea(i, "precio", e.target.value)}
            />
          </div>
        ))}"""

nuevo_fila = """        {lineas.map((l, i) => (
          <div
            key={i}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, marginBottom: 8 }}
          >
            <div className="grid grid-3">
              <select className="input" value={l.producto_id} onChange={(e) => setLinea(i, "producto_id", e.target.value)}>
                <option value="">Producto…</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                className="input num"
                type="number"
                min="0"
                step="1"
                placeholder="Cantidad"
                value={l.cantidad}
                onChange={(e) => setLinea(i, "cantidad", e.target.value)}
              />
              <input
                className="input num"
                type="number"
                min="0"
                step="0.1"
                placeholder="Precio unit."
                value={l.precio}
                onChange={(e) => setLinea(i, "precio", e.target.value)}
              />
            </div>
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Indicaciones: bañada en chantilly, rellena de fudge, dedicatoria…"
              value={l.nota}
              onChange={(e) => setLinea(i, "nota", e.target.value)}
            />
          </div>
        ))}"""

if viejo_fila not in s:
    raise SystemExit("no se encontro el bloque de filas de producto")
s = s.replace(viejo_fila, nuevo_fila, 1)

# 7. lista de pedidos usando el componente desplegable
ini = s.find("{pedidos.length === 0 ? (")
if ini == -1:
    raise SystemExit("no se encontro la lista de pedidos")
fin_marca = "          ))\n        )}\n"
fin = s.find(fin_marca, ini)
if fin == -1:
    raise SystemExit("no se encontro el cierre de la lista")
fin += len(fin_marca)

nueva_lista = """{pedidos.length === 0 ? (
          <p className="empty">Todavía no hay pedidos.</p>
        ) : (
          pedidos.map((p) => (
            <PedidoDetalle
              key={p.id}
              pedido={p}
              nombres={nombres}
              accion={
                p.estado !== "entregado" && p.estado !== "cancelado" ? (
                  <button className="btn btn-sm" onClick={() => pasarAProduccion(p)}>
                    Sincronizar con producción
                  </button>
                ) : null
              }
            />
          ))
        )}
"""
s = s[:ini] + nueva_lista + s[fin:]

# 8. mapa de nombres
s = s.replace(
    "  return (\n    <>\n      <h1>Pedidos</h1>",
    """  const nombres: Record<string, string> = {};
  productos.forEach((p) => {
    nombres[p.id] = p.nombre;
  });

  return (
    <>
      <h1>Pedidos</h1>""",
    1,
)

p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig)
print("nota en linea:", "nota: string" in s)
print("componente:", "PedidoDetalle" in s)
print("campo indicaciones:", "Indicaciones:" in s)
