"""Alta rapida de productos (ej. bocaditos) desde Pedidos."""
from pathlib import Path

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "nuevoProducto" in s:
    raise SystemExit("ya estaba aplicado")

s = s.replace(
    '  const [lugar, setLugar] = useState("");',
    '  const [lugar, setLugar] = useState("");\n'
    '  const [nuevoProducto, setNuevoProducto] = useState("");\n'
    '  const [creandoProd, setCreandoProd] = useState(false);',
    1,
)

s = s.replace(
    "  async function guardar(e: React.FormEvent) {",
    """  async function crearProductoRapido() {
    setErr(null);
    setMsg(null);
    const nombre = nuevoProducto.trim();
    if (!nombre) return;
    setCreandoProd(true);
    const { error } = await supabase.from("productos").insert({ nombre, unidad: "unidad" });
    setCreandoProd(false);
    if (error) return setErr(error.message);
    setNuevoProducto("");
    setMsg(`Producto "${nombre}" creado. Ya puedes elegirlo en la lista.`);
    cargar();
  }

  async function guardar(e: React.FormEvent) {""",
    1,
)

marca = """          <strong>{soles(total)}</strong>
        </div>"""
if marca not in s:
    raise SystemExit("no se encontro el pie de las lineas")

nuevo = """          <strong>{soles(total)}</strong>
        </div>

        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 10,
            padding: 10,
            marginTop: 8,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            ¿Producto que no está en la lista? (bocaditos, tortas especiales…)
          </span>
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="Nombre del producto"
            value={nuevoProducto}
            onChange={(e) => setNuevoProducto(e.target.value)}
          />
          <button className="btn btn-sm" type="button" onClick={crearProductoRapido} disabled={creandoProd}>
            {creandoProd ? "Creando…" : "Crear producto"}
          </button>
        </div>"""

s = s.replace(marca, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig, "| crear:", "crearProductoRapido" in s)
