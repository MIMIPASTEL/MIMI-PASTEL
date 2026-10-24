"""Acciones visibles siempre en la tarjeta de pedido + eliminar directo."""
from pathlib import Path

# ---------- PedidoDetalle ----------
p = Path("components/PedidoDetalle.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    "  accion?: React.ReactNode;\n  abiertoInicial?: boolean;",
    "  accion?: React.ReactNode;\n  onEliminar?: () => void;\n  abiertoInicial?: boolean;",
    1,
)

s = s.replace(
    "export default function PedidoDetalle({ pedido, nombres = {}, accion, abiertoInicial = false }: Props) {\n  const [abierto, setAbierto] = useState(abiertoInicial);",
    "export default function PedidoDetalle({ pedido, nombres = {}, accion, onEliminar, abiertoInicial = false }: Props) {\n  const [abierto, setAbierto] = useState(abiertoInicial);\n  const [confirmar, setConfirmar] = useState(false);",
    1,
)

# reorganizar: la cabecera deja de ser un boton que envuelve todo
viejo = """  return (
    <div style={{ borderBottom: "1px solid #f3ebe5" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: "10px 0",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "inherit",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >"""

nuevo = """  return (
    <div style={{ borderBottom: "1px solid #f3ebe5" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          color: "inherit",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >"""

if viejo not in s:
    raise SystemExit("no se encontro la cabecera del detalle")
s = s.replace(viejo, nuevo, 1)

# cerrar el boton y abrir la columna de acciones
viejo2 = """        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          {total > 0 && <div style={{ fontSize: 13, fontWeight: 600 }}>S/ {total.toFixed(2)}</div>}
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{abierto ? "▲ ocultar" : "▼ ver detalle"}</div>
        </div>
      </button>
"""

nuevo2 = """        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          {total > 0 && <div style={{ fontSize: 13, fontWeight: 600 }}>S/ {total.toFixed(2)}</div>}
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{abierto ? "▲ ocultar" : "▼ ver detalle"}</div>
        </div>
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {accion}
        {onEliminar && (
          confirmar ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm btn-danger" type="button" onClick={onEliminar}>
                Sí
              </button>
              <button className="btn btn-sm" type="button" onClick={() => setConfirmar(false)}>
                No
              </button>
            </div>
          ) : (
            <button className="btn btn-sm btn-danger" type="button" onClick={() => setConfirmar(true)}>
              Eliminar
            </button>
          )
        )}
      </div>
      </div>
"""

if viejo2 not in s:
    raise SystemExit("no se encontro el cierre de la cabecera")
s = s.replace(viejo2, nuevo2, 1)

# la accion ya no se repite dentro del detalle
s = s.replace("          {accion && <div style={{ marginTop: 10 }}>{accion}</div>}\n", "")

p.write_text(s, encoding="utf-8")
print("detalle:", s != orig, "| onEliminar:", "onEliminar" in s)
