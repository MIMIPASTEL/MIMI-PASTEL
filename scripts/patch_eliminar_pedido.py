"""Eliminar pedidos cancelados."""
from pathlib import Path

# ---------- EditarPedido ----------
p = Path("components/EditarPedido.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    'import { sincronizarPedido } from "@/lib/pedidos";',
    'import { quitarPedidoDeProduccion, sincronizarPedido } from "@/lib/pedidos";',
    1,
)

s = s.replace(
    """  onClose,
  onSaved,
}: {
  pedido: any;
  productos: Prod[];
  onClose: () => void;
  onSaved: () => void;
}) {""",
    """  onClose,
  onSaved,
  onDeleted,
}: {
  pedido: any;
  productos: Prod[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {""",
    1,
)

s = s.replace(
    "  const [guardando, setGuardando] = useState(false);",
    "  const [guardando, setGuardando] = useState(false);\n  const [confirmando, setConfirmando] = useState(false);",
    1,
)

s = s.replace(
    "  return (\n    <div className=\"modal-overlay\" onClick={onClose}>",
    """  async function eliminar() {
    setErr(null);
    setGuardando(true);
    await quitarPedidoDeProduccion(pedido.id);
    const { error } = await supabase.from("pedidos").delete().eq("id", pedido.id);
    setGuardando(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (onDeleted) onDeleted();
    else onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>""",
    1,
)

viejo_pie = """        <div className="row" style={{ marginTop: 8 }}>
          <strong>Total: {soles(total)}</strong>
          <button className="btn btn-primary" onClick={guardar} disabled={guardando} type="button">
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>"""

nuevo_pie = """        <div className="row" style={{ marginTop: 8, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!confirmando ? (
              <button
                className="btn btn-sm btn-danger"
                type="button"
                onClick={() => setConfirmando(true)}
              >
                Eliminar pedido
              </button>
            ) : (
              <>
                <span style={{ fontSize: 13 }}>¿Eliminar definitivamente?</span>
                <button className="btn btn-sm btn-danger" type="button" onClick={eliminar} disabled={guardando}>
                  Sí, eliminar
                </button>
                <button className="btn btn-sm" type="button" onClick={() => setConfirmando(false)}>
                  No
                </button>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <strong>Total: {soles(total)}</strong>
            <button className="btn btn-primary" onClick={guardar} disabled={guardando} type="button">
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>"""

if viejo_pie not in s:
    raise SystemExit("no se encontro el pie del modal")
s = s.replace(viejo_pie, nuevo_pie, 1)

p.write_text(s, encoding="utf-8")
print("modal:", s != orig, "| eliminar:", "Sí, eliminar" in s)

# ---------- pedidos: pasar onDeleted ----------
q = Path("app/pedidos/page.tsx")
t = q.read_text(encoding="utf-8")
orig2 = t

t = t.replace(
    """          onSaved={() => {
            setEditando(null);
            setMsg("Pedido actualizado y sincronizado con producción.");
            cargar();
          }}""",
    """          onSaved={() => {
            setEditando(null);
            setMsg("Pedido actualizado y sincronizado con producción.");
            cargar();
          }}
          onDeleted={() => {
            setEditando(null);
            setMsg("Pedido eliminado y retirado de producción.");
            cargar();
          }}""",
    1,
)

q.write_text(t, encoding="utf-8")
print("pedidos:", t != orig2, "| onDeleted:", "onDeleted" in t)
