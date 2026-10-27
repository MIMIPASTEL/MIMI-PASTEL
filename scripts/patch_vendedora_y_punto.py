from pathlib import Path

# ---------- 1. VENTAS: campo vendedora ----------
p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "vendedoraId" not in s:
    s = s.replace(
        '  const [tocado, setTocado] = useState(false);',
        '  const [tocado, setTocado] = useState(false);\n  const [vendedoraId, setVendedoraId] = useState("");\n  const [vendedoras, setVendedoras] = useState<any[]>([]);',
        1,
    )

    # cargar vendedoras
    s = s.replace(
        '    setPuntos((pv.data ?? []) as Punto[]);',
        '    setPuntos((pv.data ?? []) as Punto[]);\n'
        '    const { data: vd } = await supabase.from("perfiles").select("id, nombre").eq("rol", "ventas").order("nombre");\n'
        '    setVendedoras(vd ?? []);',
        1,
    )

    # guardar en la venta
    s = s.replace(
        "        total: ventaNeta,",
        "        vendedora_id: vendedoraId || null,\n        total: ventaNeta,",
        1,
    )

    # selector en el cierre
    ancla = '          <div className="field">\n            <label className="f">Efectivo</label>'
    selector = '''          <div className="field">
            <label className="f">Vendedora</label>
            <select className="input" value={vendedoraId} onChange={(e) => setVendedoraId(e.target.value)}>
              <option value="">—</option>
              {vendedoras.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>
''' + ancla
    if ancla in s:
        s = s.replace(ancla, selector, 1)

p.write_text(s, encoding="utf-8")
print("ventas:", "vendedoraId" in s)

# ---------- 2. CAJA: mostrar el punto ----------
c = Path("app/caja/page.tsx")
t = c.read_text(encoding="utf-8")
orig2 = t

t = t.replace(
    '.select("id, fecha, tipo, categoria_codigo, monto, medio, concepto")',
    '.select("id, fecha, tipo, categoria_codigo, monto, medio, concepto, punto_venta_id")',
    1,
)
t = t.replace(
    "  concepto: string | null;\n};",
    "  concepto: string | null;\n  punto_venta_id: string | null;\n};",
    1,
)
t = t.replace(
    '  const [consumo, setConsumo] = useState(0);',
    '  const [consumo, setConsumo] = useState(0);\n  const [puntos, setPuntos] = useState<any[]>([]);',
    1,
)
t = t.replace(
    "    setMovs((mv.data ?? []) as Mov[]);",
    '    const { data: pv } = await supabase.from("puntos_venta").select("id, codigo");\n'
    "    setPuntos(pv ?? []);\n"
    "    setMovs((mv.data ?? []) as Mov[]);",
    1,
)
t = t.replace(
    "<tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th className=\"num\">Monto</th><th></th></tr>",
    "<tr><th>Fecha</th><th>Punto</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th className=\"num\">Monto</th><th></th></tr>",
    1,
)
t = t.replace(
    """                    <td>{m.fecha}</td>
                    <td>{m.tipo === "ingreso" ? "Ingreso" : "Salida"}</td>""",
    """                    <td>{m.fecha}</td>
                    <td>{puntos.find((x) => x.id === m.punto_venta_id)?.codigo ?? "—"}</td>
                    <td>{m.tipo === "ingreso" ? "Ingreso" : "Salida"}</td>""",
    1,
)

c.write_text(t, encoding="utf-8")
print("caja:", "punto_venta_id" in t)
