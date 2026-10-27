from pathlib import Path

r = Path("app/repartos/page.tsx")
s = r.read_text(encoding="utf-8")
orig = s
if "aprobado: false" not in s:
    s = s.replace(
        '        concepto: etiqueta,\n        referencia: ref,',
        '        concepto: etiqueta,\n        referencia: ref,\n        aprobado: false,',
    )
r.write_text(s, encoding="utf-8")
print("repartos:", s.count("aprobado: false"))

c = Path("components/CobroPedido.tsx")
t = c.read_text(encoding="utf-8")
orig2 = t
if "aprobado: false" not in t:
    t = t.replace(
        '      referencia: `pedido:${pedidoId}`,',
        '      referencia: `pedido:${pedidoId}`,\n      aprobado: false,',
        1,
    )
c.write_text(t, encoding="utf-8")
print("pedidos:", t.count("aprobado: false"))
