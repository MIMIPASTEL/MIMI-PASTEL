"""Lugar de entrega y tipo de empaque en pedidos."""
from pathlib import Path

# ================= PEDIDOS =================
p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    'type Linea = { producto_id: string; cantidad: string; precio: string; nota: string };',
    'type Linea = { producto_id: string; cantidad: string; precio: string; nota: string; empaque: string };',
    1,
)

s = s.replace(
    'useState<Linea[]>([{ producto_id: "", cantidad: "", precio: "", nota: "" }])',
    'useState<Linea[]>([{ producto_id: "", cantidad: "", precio: "", nota: "", empaque: "" }])',
)
s = s.replace(
    'setLineas([{ producto_id: "", cantidad: "", precio: "", nota: "" }]);',
    'setLineas([{ producto_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]);',
    1,
)
s = s.replace(
    '[...l, { producto_id: "", cantidad: "", precio: "", nota: "" }]',
    '[...l, { producto_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]',
    1,
)

# estado lugar
s = s.replace(
    '  const [telefono, setTelefono] = useState("");',
    '  const [telefono, setTelefono] = useState("");\n  const [lugar, setLugar] = useState("");',
    1,
)

# campo lugar en el formulario
s = s.replace(
    """          <div className="field">
            <label className="f">Teléfono</label>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
          </div>
        </div>""",
    """          <div className="field">
            <label className="f">Teléfono</label>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="field">
          <label className="f">Lugar de entrega</label>
          <input
            className="input"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Dirección o referencia (ej. Av. Lima 245, frente al mercado)"
          />
        </div>""",
    1,
)

# empaque por linea
s = s.replace(
    """            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Indicaciones: bañada en chantilly, rellena de fudge, dedicatoria…"
              value={l.nota}
              onChange={(e) => setLinea(i, "nota", e.target.value)}
            />""",
    """            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Indicaciones: bañada en chantilly, rellena de fudge, dedicatoria…"
              value={l.nota}
              onChange={(e) => setLinea(i, "nota", e.target.value)}
            />
            <select
              className="input"
              style={{ marginTop: 8 }}
              value={l.empaque}
              onChange={(e) => setLinea(i, "empaque", e.target.value)}
            >
              <option value="">Empaque…</option>
              <option value="caja">Caja</option>
              <option value="bolsa">Bolsa</option>
              <option value="bandeja">Bandeja</option>
              <option value="otro">Otro</option>
            </select>""",
    1,
)

# guardar
s = s.replace(
    '        telefono: telefono || null,',
    '        telefono: telefono || null,\n        lugar: lugar || null,',
    1,
)
s = s.replace(
    '        nota: l.nota?.trim() ? l.nota.trim() : null,',
    '        nota: l.nota?.trim() ? l.nota.trim() : null,\n        empaque: l.empaque || null,',
    1,
)

# consulta
s = s.replace(
    "pedido_items(producto_id, cantidad, precio_unitario, tamano, nota, productos(nombre))",
    "pedido_items(producto_id, cantidad, precio_unitario, tamano, nota, empaque, productos(nombre))",
)
s = s.replace(
    '.select("id, cliente, telefono, notas, fecha_entrega',
    '.select("id, cliente, telefono, lugar, notas, fecha_entrega',
    1,
)

# limpiar lugar y borrador
s = s.replace(
    '    setTelefono("");',
    '    setTelefono("");\n    setLugar("");',
    1,
)
s = s.replace(
    '() => guardarBorrador("mip:pedido:nuevo", { cliente, telefono, fecha, hora, puntoId, adelanto, lineas }),',
    '() => guardarBorrador("mip:pedido:nuevo", { cliente, telefono, lugar, fecha, hora, puntoId, adelanto, lineas }),',
    1,
)
s = s.replace(
    "  }, [draftListo, cliente, telefono, fecha, hora, puntoId, adelanto, lineas]);",
    "  }, [draftListo, cliente, telefono, lugar, fecha, hora, puntoId, adelanto, lineas]);",
    1,
)
s = s.replace(
    '      if (typeof d.telefono === "string") setTelefono(d.telefono);',
    '      if (typeof d.telefono === "string") setTelefono(d.telefono);\n      if (typeof d.lugar === "string") setLugar(d.lugar);',
    1,
)

p.write_text(s, encoding="utf-8")
print("pedidos:", s != orig, "| lugar:", "setLugar" in s, "| empaque:", "empaque" in s)

# ================= EDITAR PEDIDO =================
q = Path("components/EditarPedido.tsx")
e = q.read_text(encoding="utf-8")
orig2 = e

e = e.replace(
    'type Linea = { producto_id: string; cantidad: string; precio: string; tamano: string; nota: string };',
    'type Linea = { producto_id: string; cantidad: string; precio: string; tamano: string; nota: string; empaque: string };',
    1,
)
e = e.replace(
    '  const [telefono, setTelefono] = useState(pedido.telefono ?? "");',
    '  const [telefono, setTelefono] = useState(pedido.telefono ?? "");\n  const [lugar, setLugar] = useState(pedido.lugar ?? "");',
    1,
)
e = e.replace(
    """      tamano: it.tamano ?? "",
      nota: it.nota ?? "",""",
    """      tamano: it.tamano ?? "",
      nota: it.nota ?? "",
      empaque: it.empaque ?? "",""",
    1,
)
e = e.replace(
    "        telefono: telefono || null,",
    "        telefono: telefono || null,\n        lugar: lugar || null,",
    1,
)
e = e.replace(
    "        nota: l.nota.trim() || null,",
    "        nota: l.nota.trim() || null,\n        empaque: l.empaque || null,",
    1,
)
e = e.replace(
    """          <div className="field">
            <label className="f">Teléfono</label>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
        </div>""",
    """          <div className="field">
            <label className="f">Teléfono</label>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="f">Lugar de entrega</label>
          <input className="input" value={lugar} onChange={(e) => setLugar(e.target.value)} />
        </div>""",
    1,
)
e = e.replace(
    """              <input
                className="input"
                placeholder="Indicaciones: bañada en chantilly…"
                value={l.nota}
                onChange={(e) => setLinea(i, "nota", e.target.value)}
              />
            </div>""",
    """              <input
                className="input"
                placeholder="Indicaciones: bañada en chantilly…"
                value={l.nota}
                onChange={(e) => setLinea(i, "nota", e.target.value)}
              />
            </div>
            <select
              className="input"
              style={{ marginTop: 8 }}
              value={l.empaque}
              onChange={(e) => setLinea(i, "empaque", e.target.value)}
            >
              <option value="">Empaque…</option>
              <option value="caja">Caja</option>
              <option value="bolsa">Bolsa</option>
              <option value="bandeja">Bandeja</option>
              <option value="otro">Otro</option>
            </select>""",
    1,
)
e = e.replace(
    """            setLineas((l) => [...l, { producto_id: "", cantidad: "", precio: "", tamano: "", nota: "" }])""",
    """            setLineas((l) => [...l, { producto_id: "", cantidad: "", precio: "", tamano: "", nota: "", empaque: "" }])""",
    1,
)

q.write_text(e, encoding="utf-8")
print("editar:", e != orig2, "| empaque:", "empaque" in e)

# ================= DETALLE =================
d = Path("components/PedidoDetalle.tsx")
t = d.read_text(encoding="utf-8")
orig3 = t

t = t.replace(
    """              {it.tamano && (""",
    """              {it.empaque && (
                <p style={{ margin: "4px 0 0", fontSize: 13 }}>📦 Empaque: {it.empaque}</p>
              )}
              {it.tamano && (""",
    1,
)
t = t.replace(
    """          {pedido.telefono && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>📞 {pedido.telefono}</p>
          )}""",
    """          {pedido.lugar && (
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>📍 {pedido.lugar}</p>
          )}
          {pedido.telefono && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>📞 {pedido.telefono}</p>
          )}""",
    1,
)

d.write_text(t, encoding="utf-8")
print("detalle:", t != orig3)

# ================= PROGRAMACION (consulta) =================
r = Path("app/programacion/page.tsx")
u = r.read_text(encoding="utf-8")
u = u.replace(
    '.select("id, cliente, telefono, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))")',
    '.select("id, cliente, telefono, lugar, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, empaque, productos(nombre))")',
    1,
)
r.write_text(u, encoding="utf-8")
print("programacion:", "lugar" in u)
