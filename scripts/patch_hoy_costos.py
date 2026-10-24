"""Tarjeta de costos del dia en la pantalla Hoy."""
from pathlib import Path

p = Path("app/hoy/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    "  const [caja, setCaja] = useState<{ ing: number; sal: number }>({ ing: 0, sal: 0 });",
    "  const [caja, setCaja] = useState<{ ing: number; sal: number }>({ ing: 0, sal: 0 });\n  const [costos, setCostos] = useState<any>(null);",
    1,
)

s = s.replace(
    "      const [u, c, q, pe, mv] = await Promise.all([",
    "      const [u, c, q, pe, mv, co] = await Promise.all([",
    1,
)

s = s.replace(
    '        supabase.from("movimientos_caja").select("tipo, monto").eq("fecha", hoy),\n      ]);',
    '        supabase.from("movimientos_caja").select("tipo, monto").eq("fecha", hoy),\n'
    '        supabase.from("v_costos_dia").select("*").eq("fecha", hoy).maybeSingle(),\n      ]);',
    1,
)

s = s.replace(
    "      setCaja({ ing, sal });",
    "      setCaja({ ing, sal });\n      setCostos(co.data ?? null);",
    1,
)

marca = '      <div className="card">\n        <h2>Ventas por canal</h2>'
if marca not in s:
    raise SystemExit("no se encontro la tarjeta de ventas por canal")

tarjeta = """      <div className="card">
        <h2>Costos del día</h2>
        <div className="grid grid-4">
          <div className="kpi">
            <div className="label">Producido</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.costo_produccion)}</div>
            <div className="hint">{numero(costos?.unidades_producidas)} unid.</div>
          </div>
          <div className="kpi">
            <div className="label">Costo de ventas</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.costo_ventas)}</div>
            <div className="hint">{numero(costos?.unidades_vendidas)} unid. vendidas</div>
          </div>
          <div className="kpi">
            <div className="label">Sobrante a mañana</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.valor_sobrante_hoy)}</div>
            <div className="hint">{numero(costos?.unidades_sobrante_hoy)} unid. (inventario)</div>
          </div>
          <div className="kpi">
            <div className="label">Merma</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.valor_merma)}</div>
            <div className="hint">{numero(costos?.unidades_merma)} unid.</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "10px 0 0" }}>
          Producir no es gastar: lo que no se vende queda como inventario y se costea cuando sale.
          {Number(costos?.valor_sobrante_ayer ?? 0) > 0
            ? ` Hoy entraron ${soles(costos?.valor_sobrante_ayer)} de sobrante de ayer.`
            : ""}
        </p>
      </div>

"""
s = s.replace(marca, tarjeta + marca, 1)

p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig, "| costos:", "v_costos_dia" in s)
