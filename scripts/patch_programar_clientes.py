from pathlib import Path

p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. estado
s = s.replace(
    '  const [nuevoNombre, setNuevoNombre] = useState("");',
    '  const [nuevoNombre, setNuevoNombre] = useState("");\n  const [nuevoFijo, setNuevoFijo] = useState(false);',
    1,
)

# 2. insertar con el tipo elegido
s = s.replace(
    '.insert({ codigo, nombre, tipo: "repartos", es_fijo: false })',
    '.insert({ codigo, nombre, tipo: "repartos", es_fijo: nuevoFijo })',
    1,
)

# 3. desactivar cliente
ancla = "  async function crearEventual() {"
funcion = """  async function desactivarCliente(p: Punto) {
    if (!confirm(`Desactivar a ${p.codigo}? Dejara de aparecer en programacion y repartos.`)) return;
    const { error } = await supabase.from("puntos_venta").update({ es_fijo: false }).eq("id", p.id);
    if (error) return setErr(error.message);
    setPuntos((ps) => ps.map((x) => (x.id === p.id ? { ...x, es_fijo: false } : x)));
    setMsg(`${p.codigo} desactivado. Su historial se conserva.`);
  }

""" + ancla
s = s.replace(ancla, funcion, 1)

# 4. etiqueta del boton
s = s.replace('+ A\u00f1adir cliente eventual', '+ A\u00f1adir cliente')
s = s.replace('+ A\ufffdadir cliente eventual', '+ A\u00f1adir cliente')

# 5. checkbox de cliente fijo en el formulario
s = s.replace(
    """            <button className="btn btn-primary" type="button" onClick={crearEventual}>
              Agregar
            </button>""",
    """            <label className="row" style={{ gap: 6, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={nuevoFijo}
                onChange={(e) => setNuevoFijo(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Cliente fijo de reparto
            </label>
            <button className="btn btn-primary" type="button" onClick={crearEventual}>
              Agregar
            </button>""",
    1,
)

# 6. lista de clientes de reparto con desactivar
ancla2 = """        {abrirNuevo && (
          <p className="sub" style={{ margin: "8px 0 0" }}>"""
lista = """        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {puntos
            .filter((p) => p.tipo === "repartos" && p.es_fijo)
            .map((p) => (
              <span
                key={p.id}
                className="badge"
                style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "4px 8px" }}
              >
                {p.codigo}
                <button
                  type="button"
                  onClick={() => desactivarCliente(p)}
                  style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", fontWeight: 700 }}
                  title="Desactivar cliente"
                >
                  \u00d7
                </button>
              </span>
            ))}
        </div>

""" + ancla2
if ancla2 in s:
    s = s.replace(ancla2, lista, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| fijo:", "nuevoFijo" in s, "| desactivar:", "desactivarCliente" in s)
