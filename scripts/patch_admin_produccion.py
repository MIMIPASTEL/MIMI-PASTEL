from pathlib import Path

p = Path("app/admin/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "RegistroProduccion" not in s:
    s = s.replace(
        'import RecetasAdmin from "@/components/RecetasAdmin";',
        'import RecetasAdmin from "@/components/RecetasAdmin";\n'
        'import RegistroProduccion from "@/components/RegistroProduccion";\n'
        'import InsumosProduccion from "@/components/InsumosProduccion";\n'
        'import { hoyISO } from "@/lib/supabase";',
        1,
    )

    ancla = "      <RecetasAdmin productos={productos} />"
    if ancla not in s:
        raise SystemExit("no se encontro RecetasAdmin")

    bloque = """      <RecetasAdmin productos={productos} />

      <RegistroProduccion productos={productos} />

      <InsumosProduccion fecha={hoyISO()} />
"""
    s = s.replace(ancla, bloque, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| registro:", "RegistroProduccion" in s, "| insumos:", "InsumosProduccion" in s)
