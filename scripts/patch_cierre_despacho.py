"""Nav Cierre + despacho en Produccion + promociones en Ventas."""
from pathlib import Path

# ---------- Shell: item Cierre ----------
p = Path("components/Shell.tsx")
s = p.read_text(encoding="utf-8")
if '"/cierre"' not in s:
    s = s.replace(
        '  { href: "/admin", label: "Ajustes", ico: "⚙️", roles: ["admin"] },',
        '  { href: "/cierre", label: "Cierre", ico: "📊", roles: ["admin"] },\n'
        '  { href: "/admin", label: "Ajustes", ico: "⚙️", roles: ["admin"] },',
        1,
    )
    p.write_text(s, encoding="utf-8")
    print("shell ok")
else:
    print("shell ya tenia cierre")

# ---------- CSS: 7 columnas ----------
css = Path("app/globals.css")
c = css.read_text(encoding="utf-8")
c = c.replace("grid-template-columns: repeat(6, 1fr);", "grid-template-columns: repeat(7, 1fr);")
c = c.replace("grid-template-columns: repeat(6, auto);", "grid-template-columns: repeat(7, auto);")
c = c.replace("font-size: 10.5px; color: var(--muted); font-weight: 600;", "font-size: 10px; color: var(--muted); font-weight: 600;")
css.write_text(c, encoding="utf-8")
print("css ok")

# ---------- Produccion: componente Despacho ----------
q = Path("app/produccion/page.tsx")
t = q.read_text(encoding="utf-8")
orig = t

if "Despacho" not in t:
    t = t.replace(
        'import PedidoDetalle from "@/components/PedidoDetalle";',
        'import PedidoDetalle from "@/components/PedidoDetalle";\nimport Despacho from "@/components/Despacho";',
        1,
    )

marca = """      <div className="card">
        <h2>Registrar producción</h2>"""
if marca not in t:
    raise SystemExit("no se encontro la tarjeta de produccion")

t = t.replace(
    marca,
    """      <Despacho fecha={fecha} productos={productos} puntos={puntos} />

""" + marca,
    1,
)

q.write_text(t, encoding="utf-8")
print("produccion:", t != orig)
