from pathlib import Path

p = Path("app/pedidos/page.tsx")
t = p.read_text(encoding="utf-8")

MARCAS = ("\u00c3", "\u00e2", "\u00f0")


def parece_mojibake(linea: str) -> bool:
    return any(m in linea for m in MARCAS)


salida = []
arregladas = 0
for linea in t.split("\n"):
    if parece_mojibake(linea):
        try:
            fix = linea.encode("cp1252").decode("utf-8")
            salida.append(fix)
            arregladas += 1
            continue
        except Exception:
            pass
    salida.append(linea)

p.write_text("\n".join(salida), encoding="utf-8")
print("lineas arregladas:", arregladas)

final = p.read_text(encoding="utf-8")
resto = [i for i, l in enumerate(final.split("\n"), 1) if parece_mojibake(l)]
print("quedan:", resto)
