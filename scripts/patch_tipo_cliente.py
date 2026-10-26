from pathlib import Path

# ---------- 1. tipo en la fila de precios ----------
p = Path("components/PreciosCliente.tsx")
s = p.read_text(encoding="utf-8")
s = s.replace(
    '  directo: string;\n  distribuidor: string;\n};',
    '  directo: string;\n  distribuidor: string;\n  _orden: number;\n};',
    1,
)
p.write_text(s, encoding="utf-8")
print("precios:", "_orden" in s)

# ---------- 2. agregar a Ajustes ----------
a = Path("app/admin/page.tsx")
t = a.read_text(encoding="utf-8")
if "PreciosCliente" not in t:
    t = t.replace(
        'import CostosAdmin from "@/components/CostosAdmin";',
        'import CostosAdmin from "@/components/CostosAdmin";\nimport PreciosCliente from "@/components/PreciosCliente";',
        1,
    )
    t = t.replace(
        "      <CostosAdmin />",
        "      <CostosAdmin />\n\n      <PreciosCliente />",
        1,
    )
    a.write_text(t, encoding="utf-8")
print("admin:", "PreciosCliente" in t)

# ---------- 3. tipo de cliente en pedidos ----------
q = Path("app/pedidos/page.tsx")
u = q.read_text(encoding="utf-8")
orig = u

if "tipoCliente" not in u:
    u = u.replace(
        '  const [lugar, setLugar] = useState("");',
        '  const [lugar, setLugar] = useState("");\n  const [tipoCliente, setTipoCliente] = useState("directo");',
        1,
    )

    u = u.replace(
        "        lugar: lugar || null,",
        "        lugar: lugar || null,\n        tipo_cliente: tipoCliente,",
        1,
    )

    # selector en el formulario (debajo de lugar)
    ancla = """        <div className="field">
          <label className="f">Lugar de entrega</label>"""
    selector = """        <div className="field">
          <label className="f">Tipo de cliente</label>
          <select className="input" value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value)}>
            <option value="directo">Cliente directo</option>
            <option value="distribuidor">Distribuidor</option>
          </select>
        </div>

""" + ancla
    if ancla not in u:
        raise SystemExit("no se encontro lugar de entrega")
    u = u.replace(ancla, selector, 1)

    # limpiar tras guardar
    u = u.replace(
        '    setLugar("");',
        '    setLugar("");\n    setTipoCliente("directo");',
        1,
    )

q.write_text(u, encoding="utf-8")
print("pedidos:", u != orig, "| tipo:", "tipoCliente" in u)
