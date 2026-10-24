from pathlib import Path

p = Path("app/produccion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "ProduccionDelDia" not in s:
    s = s.replace(
        'import InsumosProduccion from "@/components/InsumosProduccion";',
        'import InsumosProduccion from "@/components/InsumosProduccion";\nimport ProduccionDelDia from "@/components/ProduccionDelDia";',
        1,
    )

marca = "      <SobrantesRevision fecha={fecha} productos={productos} puntos={puntos} />"
if marca not in s:
    raise SystemExit("no se encontro SobrantesRevision")

s = s.replace(marca, "      <ProduccionDelDia fecha={fecha} productos={productos} />\n\n" + marca, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| componente:", "ProduccionDelDia" in s)
