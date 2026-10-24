from pathlib import Path

p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")

if "const totalSobrante =" in s:
    print("ya existia")
else:
    ancla = "  const totalPedido = (p: any) =>"
    if ancla not in s:
        raise SystemExit("no se encontro totalPedido")
    s = s.replace(
        ancla,
        "  const totalSobrante = Object.values(sobranteProd).reduce((a, b) => a + Number(b), 0);\n\n" + ancla,
        1,
    )
    p.write_text(s, encoding="utf-8")
    print("declaracion agregada")
