from pathlib import Path

# ================= AJUSTES: agregar cliente de reparto =================
p = Path("app/admin/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "crearClienteReparto" not in s:
    s = s.replace(
        '  const [insumoUnidad, setInsumoUnidad] = useState("kg");',
        '  const [insumoUnidad, setInsumoUnidad] = useState("kg");\n'
        '  const [nuevoCliente, setNuevoCliente] = useState("");',
        1,
    )

    s = s.replace(
        "  async function crearInsumo(e: React.FormEvent) {",
        """  async function crearClienteReparto(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const nombre = nuevoCliente.trim();
    if (!nombre) return setErr("Escribe el nombre del cliente.");
    const codigo = nombre.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 20);
    const maxOrden = puntos.reduce((a: number, p: any) => Math.max(a, Number(p.orden ?? 100)), 0);
    const { error } = await supabase.from("puntos_venta").insert({
      codigo,
      nombre,
      tipo: "repartos",
      es_fijo: true,
      orden: maxOrden + 1,
    });
    if (error) return setErr(error.message);
    setNuevoCliente("");
    setMsg(`Cliente ${codigo} agregado al reparto.`);
    cargar();
  }

  async function crearInsumo(e: React.FormEvent) {""",
        1,
    )

    ancla = """        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Programación</th>"""
    form = """        <form onSubmit={crearClienteReparto} style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Nuevo cliente de reparto"
            value={nuevoCliente}
            onChange={(e) => setNuevoCliente(e.target.value)}
          />
          <button className="btn btn-sm">Agregar cliente</button>
        </form>

""" + ancla
    if ancla not in s:
        raise SystemExit("no se encontro la tabla de puntos")
    s = s.replace(ancla, form, 1)

p.write_text(s, encoding="utf-8")
print("admin:", s != orig, "| cliente:", "crearClienteReparto" in s)

# ================= PEDIDOS: reporte por WhatsApp =================
q = Path("app/pedidos/page.tsx")
t = q.read_text(encoding="utf-8")
orig2 = t

if "enviarWhatsapp" not in t:
    t = t.replace(
        "  async function eliminarPedido(p: Pedido) {",
        """  function enviarWhatsapp(p: Pedido) {
    const items = (p.pedido_items ?? []) as any[];
    const total = items.reduce((a, it) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0), 0);
    const adelanto = Number(p.adelanto ?? 0);
    const saldo = Math.max(0, total - adelanto);

    const lineas = items
      .map((it) => {
        const nombre = it.productos?.nombre ?? nombres[it.producto_id] ?? "Producto";
        const detalle = [it.tamano ? `Tamaño: ${it.tamano}` : "", it.empaque ? `Empaque: ${it.empaque}` : "", it.nota ?? ""]
          .filter(Boolean)
          .join(" · ");
        return `• ${nombre} x${Number(it.cantidad)} — S/ ${(Number(it.cantidad) * Number(it.precio_unitario ?? 0)).toFixed(2)}` +
          (detalle ? `\\n   ${detalle}` : "");
      })
      .join("\\n");

    const texto =
      `*Mimi Pastel* 🧁\\n\\n` +
      `Cliente: ${p.cliente}\\n` +
      `Entrega: ${p.fecha_entrega}${p.hora_entrega ? " " + String(p.hora_entrega).slice(0, 5) : ""}\\n` +
      (p.lugar ? `Lugar: ${p.lugar}\\n` : "") +
      `\\nPedido:\\n${lineas}\\n\\n` +
      `Total: S/ ${total.toFixed(2)}\\n` +
      `Adelanto: S/ ${adelanto.toFixed(2)}\\n` +
      `*Saldo pendiente: S/ ${saldo.toFixed(2)}*`;

    const tel = (p.telefono ?? "").replace(/\\D/g, "");
    const destino = tel.length === 9 ? `51${tel}` : tel;
    const url = `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }

  async function eliminarPedido(p: Pedido) {""",
        1,
    )

    t = t.replace(
        """                  <button className="btn btn-sm" onClick={() => setEditando(p)}>
                    Editar pedido
                  </button>""",
        """                  <button className="btn btn-sm" onClick={() => setEditando(p)}>
                    Editar pedido
                  </button>
                  <button className="btn btn-sm" onClick={() => enviarWhatsapp(p)}>
                    WhatsApp
                  </button>""",
        1,
    )

q.write_text(t, encoding="utf-8")
print("pedidos:", t != orig2, "| whatsapp:", "enviarWhatsapp" in t)
