from pathlib import Path

# ---------- Produccion: insertar componentes ----------
p = Path("app/produccion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "SobrantesRevision" not in s:
    s = s.replace(
        'import Despacho from "@/components/Despacho";',
        'import Despacho from "@/components/Despacho";\n'
        'import SobrantesRevision from "@/components/SobrantesRevision";\n'
        'import InsumosProduccion from "@/components/InsumosProduccion";',
        1,
    )

marca = "      <Despacho fecha={fecha} productos={productos} puntos={puntos} />"
if marca not in s:
    raise SystemExit("no se encontro el componente Despacho")

s = s.replace(
    marca,
    '      <SobrantesRevision fecha={fecha} productos={productos} puntos={puntos} />\n\n' + marca,
    1,
)

# insumos al final, antes del cierre
cierre = "      {productos.length === 0 && ("
if cierre not in s:
    raise SystemExit("no se encontro el cierre de la pagina")

s = s.replace(cierre, '      <InsumosProduccion fecha={fecha} />\n\n' + cierre, 1)

p.write_text(s, encoding="utf-8")
print("produccion:", s != orig)
print("sobrantes:", "SobrantesRevision" in s, "| insumos:", "InsumosProduccion" in s)
