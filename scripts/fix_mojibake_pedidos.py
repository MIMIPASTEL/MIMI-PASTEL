import re
from pathlib import Path

p = Path("app/pedidos/page.tsx")
t = p.read_text(encoding="utf-8", errors="replace")

# separadores de linea (15 veces el caracter dañado)
t = re.sub("(?:\ufffd\x81){15}", "\u2501" * 15, t)

subs = [
    ("\ufffd\x8d\ufffd Tama\u00f1o:", "\U0001F370 Tama\u00f1o:"),
    ("\U0001F58C\ufffd\x8f Decoraci\u00f3n:", "\U0001F58C\uFE0F Decoraci\u00f3n:"),
    ("\ufffd\x81 *MIMI PASTEL*", "\U0001F9C1 *MIMI PASTEL*"),
    ("\ufffd\x8d *Lugar:*", "\U0001F4CD *Lugar:*"),
    ("\ufffd\x9d\ufffd *SALDO PENDIENTE", "\u2757 *SALDO PENDIENTE"),
    ("Todav\ufffd\xada", "Todav\u00eda"),
]

for viejo, nuevo in subs:
    if viejo not in t:
        print("NO ENCONTRADO:", repr(viejo))
    t = t.replace(viejo, nuevo)

if "\ufffd" in t:
    for i, l in enumerate(t.splitlines(), 1):
        if "\ufffd" in l:
            print("QUEDA:", i, repr(l))

p.write_text(t, encoding="utf-8")

# verificacion
final = p.read_text(encoding="utf-8")
print("ufffd restantes:", final.count("\ufffd"))
for marca in ["\U0001F9C1", "\U0001F370", "\U0001F4CD", "\u2757", "\u2501"]:
    print(repr(marca), final.count(marca))
