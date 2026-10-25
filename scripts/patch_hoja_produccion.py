from pathlib import Path

p = Path("app/produccion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# imports
s = s.replace(
    'import ParrillaPrograma from "@/components/ParrillaPrograma";',
    'import HojaProduccion from "@/components/HojaProduccion";',
    1,
)
s = s.replace('import SobrantesRevision from "@/components/SobrantesRevision";\n', "", 1)

# reemplazar parrilla y sobrantes por la hoja unica
s = s.replace(
    '      <ParrillaPrograma fecha={fecha} productos={productos} puntos={puntos} />',
    '      <HojaProduccion fecha={fecha} productos={productos} puntos={puntos} />',
    1,
)
s = s.replace(
    '      <SobrantesRevision fecha={fecha} productos={productos} puntos={puntos} />\n\n',
    "",
    1,
)

# quitar la tarjeta de merma (ahora es una fila de la hoja)
ini = s.find('<div className="card">\n        <h2>Registrar merma de producción</h2>')
if ini != -1:
    fin = s.find("<InsumosProduccion", ini)
    if fin != -1:
        s = s[:ini] + s[fin:]

p.write_text(s, encoding="utf-8")
print("ok:", s != orig)
print("hoja:", "HojaProduccion" in s, "| parrilla:", "ParrillaPrograma" in s, "| merma card:", "Registrar merma de producción" in s)
