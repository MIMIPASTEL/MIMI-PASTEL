"""Promociones combinables en Ventas + alta de promociones en Ajustes."""
from pathlib import Path

# ================= VENTAS =================
p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    '  const [gastoCategoria, setGastoCategoria] = useState("movilidad");',
    '  const [gastoCategoria, setGastoCategoria] = useState("movilidad");\n'
    "  const [promos, setPromos] = useState<any[]>([]);",
    1,
)

s = s.replace(
    "  useEffect(() => {\n    (async () => {\n      const { data } = await supabase\n        .from(\"puntos_venta\")",
    """  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("promociones")
        .select("id, nombre, cantidad, precio, promocion_productos(producto_id)")
        .eq("activo", true);
      setPromos(data ?? []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("puntos_venta")""",
    1,
)

s = s.replace(
    "  const diferenciaDinero = totalCobrado - ventaNeta;",
    """  const diferenciaDinero = totalCobrado - ventaNeta;

  const sugerencias = useMemo(() => {
    const out: { id: string; nombre: string; unidades: number; grupos: number; dto: number }[] = [];
    (promos as any[]).forEach((pr) => {
      const ids = new Set((pr.promocion_productos ?? []).map((x: any) => x.producto_id));
      if (ids.size === 0) return;
      let unidades = 0;
      let valor = 0;
      filas.forEach((f) => {
        if (!ids.has(f.producto_id)) return;
        const c = Number(f.vendido || 0);
        unidades += c;
        valor += c * Number(f.precio || 0);
      });
      const cant = Number(pr.cantidad);
      const grupos = Math.floor(unidades / cant);
      if (grupos === 0) return;
      const promedio = unidades > 0 ? valor / unidades : 0;
      const dto = Math.max(0, grupos * (promedio * cant - Number(pr.precio)));
      out.push({ id: pr.id, nombre: pr.nombre, unidades, grupos, dto });
    });
    return out;
  }, [promos, filas]);""",
    1,
)

viejo = """            <p className="sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Ej. promoción 3 pasteles por S/ 5
            </p>"""

nuevo = """            {sugerencias.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {sugerencias.map((sg) => (
                  <div
                    key={sg.id}
                    className="row"
                    style={{ gap: 8, fontSize: 12.5, padding: "4px 0", borderTop: "1px solid #f3ebe5" }}
                  >
                    <span>
                      {sg.nombre}: {sg.unidades} und → {sg.grupos} grupo(s) → {soles(sg.dto)}
                    </span>
                    <button
                      className="btn btn-sm"
                      type="button"
                      onClick={() => setDescuento(sg.dto.toFixed(2))}
                    >
                      Aplicar
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sugerencias.length === 0 && (
              <p className="sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
                Las promociones se calculan solas al llenar las cantidades vendidas.
              </p>
            )}"""

if viejo not in s:
    raise SystemExit("no se encontro el texto de descuento")
s = s.replace(viejo, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("ventas:", s != orig, "| promos:", "sugerencias" in s)
