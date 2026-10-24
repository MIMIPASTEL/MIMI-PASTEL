"""Alta de promociones en Ajustes."""
from pathlib import Path

p = Path("app/admin/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "promociones" in s:
    raise SystemExit("ya estaba aplicado")

# estados
s = s.replace(
    '  const [precioValor, setPrecioValor] = useState("");',
    '  const [precioValor, setPrecioValor] = useState("");\n'
    '  const [promos, setPromos] = useState<any[]>([]);\n'
    '  const [promoNombre, setPromoNombre] = useState("");\n'
    '  const [promoCant, setPromoCant] = useState("3");\n'
    '  const [promoPrecio, setPromoPrecio] = useState("");\n'
    '  const [promoProds, setPromoProds] = useState<string[]>([]);',
    1,
)

# carga
s = s.replace(
    '    const [p, pv, pr, pf] = await Promise.all([',
    '    const [p, pv, pr, pf, pm] = await Promise.all([',
    1,
)
s = s.replace(
    '      supabase.from("perfiles").select("id, nombre, rol").order("nombre"),\n    ]);',
    '      supabase.from("perfiles").select("id, nombre, rol").order("nombre"),\n'
    '      supabase.from("promociones").select("id, nombre, cantidad, precio, activo, promocion_productos(producto_id)").order("creado_en"),\n    ]);',
    1,
)
s = s.replace(
    "    setPerfiles((pf.data ?? []) as Perfil[]);",
    "    setPerfiles((pf.data ?? []) as Perfil[]);\n    setPromos((pm.data ?? []) as any[]);",
    1,
)

# funcion crear
s = s.replace(
    "  const nombreProd = (id: string) =>",
    """  async function crearPromo(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!promoNombre.trim()) return setErr("Falta el nombre de la promoción.");
    if (promoProds.length === 0) return setErr("Elige al menos un producto.");

    const { data, error } = await supabase
      .from("promociones")
      .insert({
        nombre: promoNombre.trim(),
        cantidad: Number(promoCant || 1),
        precio: Number(promoPrecio || 0),
        activo: true,
      })
      .select("id")
      .single();

    if (error || !data) return setErr(error?.message ?? "No se pudo crear");

    const { error: e2 } = await supabase.from("promocion_productos").insert(
      promoProds.map((pid) => ({ promocion_id: data.id, producto_id: pid })),
    );
    if (e2) return setErr(e2.message);

    setPromoNombre("");
    setPromoPrecio("");
    setPromoProds([]);
    setMsg("Promoción creada.");
    cargar();
  }

  async function alternarPromo(id: string, activo: boolean) {
    await supabase.from("promociones").update({ activo: !activo }).eq("id", id);
    cargar();
  }

  function toggleProd(id: string) {
    setPromoProds((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));
  }

  const nombreProd = (id: string) =>""",
    1,
)

# tarjeta
marca = '      <div className="card">\n        <h2>Usuarios</h2>'
if marca not in s:
    raise SystemExit("no se encontro la tarjeta de usuarios")

tarjeta = """      <div className="card">
        <h2>Promociones</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Se pueden combinar productos distintos: 2 empanadas de carne + 1 de pollo cuentan como 3.
        </p>

        <form onSubmit={crearPromo}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Nombre</label>
              <input className="input" value={promoNombre} onChange={(e) => setPromoNombre(e.target.value)} placeholder="3 pasteles por S/ 5" />
            </div>
            <div className="field">
              <label className="f">Cantidad</label>
              <input className="input num" type="number" min="1" step="1" value={promoCant} onChange={(e) => setPromoCant(e.target.value)} />
            </div>
            <div className="field">
              <label className="f">Precio promo (S/)</label>
              <input className="input num" type="number" min="0" step="0.1" value={promoPrecio} onChange={(e) => setPromoPrecio(e.target.value)} />
            </div>
          </div>

          <label className="f">Productos que participan</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {productos.map((pr) => (
              <button
                key={pr.id}
                type="button"
                className="btn btn-sm"
                onClick={() => toggleProd(pr.id)}
                style={
                  promoProds.includes(pr.id)
                    ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                    : undefined
                }
              >
                {pr.codigo ?? pr.nombre}
              </button>
            ))}
          </div>

          <button className="btn btn-primary">Crear promoción</button>
        </form>

        {promos.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Promoción</th>
                  <th className="num">Lleva</th>
                  <th className="num">Paga</th>
                  <th>Productos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {promos.map((pm) => (
                  <tr key={pm.id}>
                    <td>{pm.nombre}</td>
                    <td className="num">{Number(pm.cantidad)}</td>
                    <td className="num">{soles(pm.precio)}</td>
                    <td>
                      {(pm.promocion_productos ?? [])
                        .map((x: any) => {
                          const pr = productos.find((y) => y.id === x.producto_id);
                          return pr?.codigo ?? "?";
                        })
                        .join(", ")}
                    </td>
                    <td>
                      <span className={`badge ${pm.activo ? "ok" : "neutral"}`}>
                        {pm.activo ? "activa" : "inactiva"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm" onClick={() => alternarPromo(pm.id, pm.activo)}>
                        {pm.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

""" + marca

s = s.replace(marca, tarjeta, 1)

p.write_text(s, encoding="utf-8")
print("admin:", s != orig, "| promos:", "crearPromo" in s)
