from pathlib import Path

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# ---------- tipos ----------
s = s.replace(
    'type Linea = { producto_id: string; cantidad: string; precio: string; nota: string; empaque: string };',
    'type Linea = { producto_id: string; presentacion_id: string; cantidad: string; precio: string; nota: string; empaque: string };',
    1,
)

s = s.replace(
    'useState<Linea[]>([{ producto_id: "", cantidad: "", precio: "", nota: "", empaque: "" }])',
    'useState<Linea[]>([{ producto_id: "", presentacion_id: "", cantidad: "", precio: "", nota: "", empaque: "" }])',
)
s = s.replace(
    'setLineas([{ producto_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]);',
    'setLineas([{ producto_id: "", presentacion_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]);',
    1,
)
s = s.replace(
    '[...l, { producto_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]',
    '[...l, { producto_id: "", presentacion_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]',
    1,
)

# ---------- estados de presentaciones y precios ----------
s = s.replace(
    '  const [tipoCliente, setTipoCliente] = useState("directo");',
    """  const [tipoCliente, setTipoCliente] = useState("directo");
  const [presentaciones, setPresentaciones] = useState<any[]>([]);
  const [preciosCli, setPreciosCli] = useState<any[]>([]);""",
    1,
)

# ---------- cargar presentaciones y precios ----------
s = s.replace(
    """    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);""",
    """    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);

    const [pes, prc] = await Promise.all([
      supabase.from("presentaciones").select("id, producto_id, nombre, es_default, orden").order("orden"),
      supabase.from("precios_cliente").select("presentacion_id, tipo_cliente, precio"),
    ]);
    setPresentaciones((pes.data ?? []) as any[]);
    setPreciosCli((prc.data ?? []) as any[]);""",
    1,
)

# ---------- helpers ----------
s = s.replace(
    "  function setLinea(i: number, campo: keyof Linea, v: string) {",
    """  const presentacionesDe = (prodId: string) =>
    presentaciones.filter((x) => x.producto_id === prodId);

  const precioDe = (presentacionId: string, tipo: string) => {
    const row = preciosCli.find(
      (x) => x.presentacion_id === presentacionId && x.tipo_cliente === tipo,
    );
    return row ? Number(row.precio) : 0;
  };

  function elegirProducto(i: number, prodId: string) {
    const lista = presentacionesDe(prodId);
    const def = lista.find((x) => x.es_default) ?? lista[0];
    setLineas((l) =>
      l.map((x, j) =>
        j === i
          ? {
              ...x,
              producto_id: prodId,
              presentacion_id: def?.id ?? "",
              precio: def ? String(precioDe(def.id, tipoCliente)) : "",
            }
          : x,
      ),
    );
  }

  function elegirPresentacion(i: number, presId: string) {
    setLineas((l) =>
      l.map((x, j) =>
        j === i ? { ...x, presentacion_id: presId, precio: String(precioDe(presId, tipoCliente)) } : x,
      ),
    );
  }

  function setLinea(i: number, campo: keyof Linea, v: string) {""",
    1,
)

# ---------- el select de producto llama al helper ----------
s = s.replace(
    'onChange={(e) => setLinea(i, "producto_id", e.target.value)}',
    "onChange={(e) => elegirProducto(i, e.target.value)}",
)

# ---------- select de presentacion debajo del producto ----------
ancla = """            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Indicaciones: bañada en chantilly, rellena de fudge, dedicatoria…\""""
presentacion = """            {presentacionesDe(l.producto_id).length > 1 && (
              <select
                className="input"
                style={{ marginTop: 8 }}
                value={l.presentacion_id}
                onChange={(e) => elegirPresentacion(i, e.target.value)}
              >
                {presentacionesDe(l.producto_id).map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.nombre}
                  </option>
                ))}
              </select>
            )}
""" + ancla
if ancla not in s:
    raise SystemExit("no se encontro el campo de indicaciones")
s = s.replace(ancla, presentacion, 1)

# ---------- guardar presentacion ----------
s = s.replace(
    "        producto_id: l.producto_id,",
    "        producto_id: l.producto_id,\n        presentacion_id: l.presentacion_id || null,",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig)
print("presentaciones:", "elegirPresentacion" in s, "| guarda:", "presentacion_id: l.presentacion_id" in s)
