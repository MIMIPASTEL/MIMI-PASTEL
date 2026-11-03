from pathlib import Path

p = Path("components/Subproductos.tsx")
s = p.read_text(encoding="utf-8")

i = s.find("const ITEMS = [")
j = s.find("];", i) + 2

nuevo = (
    "const ITEMS = [\n"
    '  { clave: "plancha_milhoja", nombre: "Planchas de milhojas", unidad: "planchas" },\n'
    '  { clave: "bandeja_chocolate", nombre: "Bandeja de chocolate", unidad: "bandejas" },\n'
    "];"
)

s = s[:i] + nuevo + s[j:]
s = s.replace(
    "Ejemplo milhojas: produces 12 planchas, usas 8 para armar y 1 se quemó → quedan 3 para mañana.",
    "Ejemplo milhojas: produces 12 planchas, usas 8 para armar y 1 se quemó, quedan 3.",
)

p.write_text(s, encoding="utf-8")
print("ok:", "plancha_milhoja" in s)
