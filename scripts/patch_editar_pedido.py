"""Edicion de pedidos: modal, boton y tamano visible."""
from pathlib import Path

# ---------- CSS ----------
css = Path("app/globals.css")
c = css.read_text(encoding="utf-8")
if ".modal-overlay" not in c:
    c += """

/* ---------- Modal ---------- */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(36, 30, 26, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}
.modal-card {
  background: var(--surface);
  border-radius: 16px;
  padding: 18px;
  width: 100%;
  max-width: 680px;
  margin: 20px 0 48px;
  box-shadow: 0 20px 60px rgba(36, 30, 26, 0.25);
}
"""
    css.write_text(c, encoding="utf-8")
    print("css: modal agregado")
else:
    print("css: ya existia")

# ---------- PedidoDetalle: mostrar tamano ----------
d = Path("components/PedidoDetalle.tsx")
s = d.read_text(encoding="utf-8")
if "Tamaño:" not in s:
    s = s.replace(
        """              {it.nota ? (""",
        """              {it.tamano && (
                <p style={{ margin: "4px 0 0", fontSize: 13 }}>📏 Tamaño: {it.tamano}</p>
              )}
              {it.nota ? (""",
        1,
    )
    d.write_text(s, encoding="utf-8")
    print("detalle: tamano agregado")
else:
    print("detalle: ya existia")

# ---------- Pedidos: boton editar + modal ----------
p = Path("app/pedidos/page.tsx")
t = p.read_text(encoding="utf-8")
orig = t

if "EditarPedido" not in t:
    t = t.replace(
        'import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";',
        'import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";\n'
        'import EditarPedido from "@/components/EditarPedido";',
        1,
    )

if "editando" not in t:
    t = t.replace(
        "  const [draftListo, setDraftListo] = useState(false);",
        "  const [draftListo, setDraftListo] = useState(false);\n  const [editando, setEditando] = useState<any>(null);",
        1,
    )

t = t.replace(
    'pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))',
    'pedido_items(producto_id, cantidad, precio_unitario, tamano, nota, productos(nombre))',
)

viejo_accion = """              accion={
                p.estado !== "entregado" && p.estado !== "cancelado" ? (
                  <button className="btn btn-sm" onClick={() => pasarAProduccion(p)}>
                    Sincronizar con producción
                  </button>
                ) : null
              }"""

nuevo_accion = """              accion={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-sm" onClick={() => setEditando(p)}>
                    Editar pedido
                  </button>
                  {p.estado !== "entregado" && p.estado !== "cancelado" && (
                    <button className="btn btn-sm" onClick={() => pasarAProduccion(p)}>
                      Sincronizar con producción
                    </button>
                  )}
                </div>
              }"""

if viejo_accion not in t:
    raise SystemExit("no se encontro el bloque de accion del pedido")
t = t.replace(viejo_accion, nuevo_accion, 1)

if "<EditarPedido" not in t:
    t = t.replace(
        "    </>\n  );\n}",
        """      {editando && (
        <EditarPedido
          pedido={editando}
          productos={productos}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            setMsg("Pedido actualizado y sincronizado con producción.");
            cargar();
          }}
        />
      )}
    </>
  );
}""",
        1,
    )

p.write_text(t, encoding="utf-8")
print("pedidos:", t != orig, "| modal:", "<EditarPedido" in t, "| boton:", "Editar pedido" in t)
