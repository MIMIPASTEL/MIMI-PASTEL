from pathlib import Path

p = Path("app/produccion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "ParrillaPrograma" not in s:
    s = s.replace(
        'import ProduccionDelDia from "@/components/ProduccionDelDia";',
        'import ParrillaPrograma from "@/components/ParrillaPrograma";',
        1,
    )
    s = s.replace(
        '      <ProduccionDelDia fecha={fecha} productos={productos} />',
        '      <ParrillaPrograma fecha={fecha} productos={productos} puntos={puntos} />',
        1,
    )

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| parrilla:", "ParrillaPrograma" in s, "| viejo:", "ProduccionDelDia" in s)
