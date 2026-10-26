import re
from pathlib import Path

p = Path("app/pedidos/page.tsx")
raw = p.read_bytes()
t = raw.decode("utf-8", errors="replace")

nuevo = '''  function enviarWhatsapp(p: Pedido) {
    const items = (p.pedido_items ?? []) as any[];

    const total = items.reduce((a, it) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0), 0);
    const adelanto = Number(p.adelanto ?? 0);
    const saldo = Math.max(0, total - adelanto);

    const [y, m, d] = String(p.fecha_entrega).split("-");
    const fecha = `${d}/${m}/${y}`;

    let hora = "";
    if (p.hora_entrega) {
      const [hh, mi] = String(p.hora_entrega).split(":");
      const h24 = Number(hh);
      const suf = h24 >= 12 ? "p.m." : "a.m.";
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      hora = `${String(h12).padStart(2, "0")}:${mi} ${suf}`;
    }

    const detalle = items
      .map((it) => {
        const nombre = it.productos?.nombre ?? nombres[it.producto_id] ?? "Producto";
        const subtotal = (Number(it.cantidad) * Number(it.precio_unitario ?? 0)).toFixed(2);
        const lineas = [`\\u2022 ${nombre} x ${Number(it.cantidad)} \\u2014 S/ ${subtotal}`];
        if (it.tamano) lineas.push(`   Tama\\u00f1o: ${it.tamano}`);
        if (it.empaque) lineas.push(`   Empaque: ${it.empaque}`);
        if (it.nota) lineas.push(`   Decoraci\\u00f3n: ${it.nota}`);
        return lineas.join("\\n");
      })
      .join("\\n\\n");

    const texto =
      `MIMI PASTEL\\n` +
      `Confirmaci\\u00f3n de pedido\\n\\n` +
      `Gracias por tu pedido!\\n` +
      `Nos alegra ser parte de tus momentos especiales.\\n\\n` +
      `Cliente: ${p.cliente}\\n` +
      `Entrega: ${fecha}${hora ? " " + hora : ""}\\n` +
      (p.lugar ? `Lugar: ${p.lugar}\\n` : "") +
      `\\nDETALLE DEL PEDIDO\\n` +
      `------------------------------\\n` +
      `${detalle}\\n` +
      `------------------------------\\n\\n` +
      `Total: S/ ${total.toFixed(2)}\\n` +
      `Adelanto: S/ ${adelanto.toFixed(2)}\\n` +
      `SALDO PENDIENTE: S/ ${saldo.toFixed(2)}\\n\\n` +
      `Gracias por confiar en Mimi Pastel.\\n` +
      `Si no le gusta, no lo paga.`;

    const tel = (p.telefono ?? "").replace(/\\D/g, "");
    const destino = tel.length === 9 ? `51${tel}` : tel;
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, "_blank");
  }
'''

patron = re.compile(r"  function enviarWhatsapp\(p: Pedido\) \{.*?\n  \}\n", re.S)
t2, n = patron.subn(lambda m: nuevo, t, count=1)
print("funcion reemplazada:", n)

t2 = re.sub(r"Todav.{1,6}?a no hay pedidos\.", "Todav\u00eda no hay pedidos.", t2)

if "\ufffd" in t2:
    for i, l in enumerate(t2.splitlines(), 1):
        if "\ufffd" in l:
            print("QUEDA:", i, ascii(l))

p.write_text(t2, encoding="utf-8")
final = p.read_text(encoding="utf-8")
print("ufffd restantes:", final.count("\ufffd"))
print("emojis/box:", ascii([c for c in set(final) if ord(c) > 0x2000]))
