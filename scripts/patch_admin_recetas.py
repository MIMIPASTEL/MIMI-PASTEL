from pathlib import Path

p = Path("app/admin/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "RecetasAdmin" not in s:
    s = s.replace(
        'import Shell from "@/components/Shell";',
        'import Shell from "@/components/Shell";\nimport RecetasAdmin from "@/components/RecetasAdmin";',
        1,
    )

    marca = '      <div className="card">\n        <h2>Promociones</h2>'
    if marca not in s:
        raise SystemExit("no se encontro la tarjeta de promociones")

    s = s.replace(marca, "      <RecetasAdmin productos={productos} />\n\n" + marca, 1)

p.write_text(s, encoding="utf-8")
print("admin:", s != orig, "| recetas:", "RecetasAdmin" in s)
