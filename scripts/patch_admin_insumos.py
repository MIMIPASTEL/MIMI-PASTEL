from pathlib import Path

p = Path("app/admin/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "insumos" in s and "setInsumos" in s:
    raise SystemExit("ya estaba aplicado")

# estado
s = s.replace(
    '  const [promoProds, setPromoProds] = useState<string[]>([]);',
    '  const [promoProds, setPromoProds] = useState<string[]>([]);\n'
    '  const [insumos, setInsumos] = useState<any[]>([]);\n'
    '  const [insumoNombre, setInsumoNombre] = useState("");\n'
    '  const [insumoUnidad, setInsumoUnidad] = useState("kg");',
    1,
)

# carga
s = s.replace(
    "    const [p, pv, pr, pf, pm] = await Promise.all([",
    "    const [p, pv, pr, pf, pm, ins] = await Promise.all([",
    1,
)
s = s.replace(
    '      supabase.from("promociones").select("id, nombre, cantidad, precio, activo, promocion_productos(producto_id)").order("creado_en"),\n    ]);',
    '      supabase.from("promociones").select("id, nombre, cantidad, precio, activo, promocion_productos(producto_id)").order("creado_en"),\n'
    '      supabase.from("insumos").select("id, nombre, unidad_base, precio_unitario, activo").order("nombre"),\n    ]);',
    1,
)
s = s.replace(
    "    setPromos((pm.data ?? []) as any[]);",
    "    setPromos((pm.data ?? []) as any[]);\n    setInsumos((ins.data ?? []) as any[]);",
    1,
)

# funciones
s = s.replace(
    "  async function crearPromo(e: React.FormEvent) {",
    """  async function crearInsumo(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!insumoNombre.trim()) return setErr("Falta el nombre del insumo.");
    const { error } = await supabase
      .from("insumos")
      .insert({ nombre: insumoNombre.trim(), unidad_base: insumoUnidad });
    if (error) return setErr(error.message);
    setInsumoNombre("");
    setMsg("Insumo creado.");
    cargar();
  }

  async function guardarPrecioInsumo(id: string, valor: string) {
    const precio = Number(valor || 0);
    await supabase.from("insumos").update({ precio_unitario: precio }).eq("id", id);
    cargar();
  }

  async function crearPromo(e: React.FormEvent) {""",
    1,
)

# tarjeta antes de Promociones
marca = '      <div className="card">\n        <h2>Promociones</h2>'
if marca not in s:
    raise SystemExit("no se encontro la tarjeta de promociones")

tarjeta = """      <div className="card">
        <h2>Insumos y precios</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          El precio por unidad base (kg, litro, unidad) sirve para valorizar el consumo diario.
        </p>

        <form onSubmit={crearInsumo}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Nombre</label>
              <input className="input" value={insumoNombre} onChange={(e) => setInsumoNombre(e.target.value)} placeholder="Masa, fruta, manjar…" />
            </div>
            <div className="field">
              <label className="f">Unidad</label>
              <select className="input" value={insumoUnidad} onChange={(e) => setInsumoUnidad(e.target.value)}>
                <option value="kg">Kilo</option>
                <option value="l">Litro</option>
                <option value="unidad">Unidad</option>
                <option value="balon">Balón</option>
              </select>
            </div>
          </div>
          <button className="btn btn-sm">Agregar insumo</button>
        </form>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Unidad</th>
                <th className="num">Precio por unidad</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => (
                <tr key={i.id}>
                  <td>{i.nombre}</td>
                  <td>{i.unidad_base}</td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={Number(i.precio_unitario ?? 0)}
                      onBlur={(e) => guardarPrecioInsumo(i.id, e.target.value)}
                      style={{ width: 100, padding: "6px 8px" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

""" + marca

s = s.replace(marca, tarjeta, 1)

p.write_text(s, encoding="utf-8")
print("admin:", s != orig, "| insumos:", "precio_unitario" in s)
