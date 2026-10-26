import re
from pathlib import Path

FUNC = '''  function enviarWhatsapp(p: Pedido) {
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
        const lineas = [`- ${nombre} x ${Number(it.cantidad)} - S/ ${subtotal}`];
        if (it.tamano) lineas.push(`   Tamano: ${it.tamano}`);
        if (it.empaque) lineas.push(`   Empaque: ${it.empaque}`);
        if (it.nota) lineas.push(`   Decoracion: ${it.nota}`);
        return lineas.join("\\n");
      })
      .join("\\n\\n");

    const texto =
      `MIMI PASTEL\\n` +
      `Confirmacion de pedido\\n\\n` +
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

p = Path("app/pedidos/page.tsx")
data = p.read_bytes()
texto = data.decode("utf-8", errors="replace")
# normalizar saltos de linea duplicados
texto = texto.replace("\r\r\n", "\n").replace("\r\n", "\n")

patron = re.compile(r"  function enviarWhatsapp\(p: Pedido\) \{.*?\n  \}\n", re.S)
texto, n = patron.subn(lambda m: FUNC, texto, count=1)
print("funcion reemplazada:", n)

texto = re.sub(r"Todav[^\n]{0,6}?a no hay pedidos\.", "Todavia no hay pedidos.", texto)
texto = texto.replace("\ufffd", "")

p.write_bytes(texto.encode("utf-8"))

final = p.read_bytes().decode("utf-8", errors="replace")
print("ufffd:", final.count("\ufffd"), "| lineas:", final.count("\n") + 1)

# revisar los otros dos archivos
for f in ["components/PreciosCliente.tsx", "components/EditarPedido.tsx"]:
    q = Path(f)
    d = q.read_bytes().decode("utf-8", errors="replace")
    d2 = d.replace("\r\r\n", "\n").replace("\r\n", "\n")
    q.write_bytes(d2.encode("utf-8"))
    print(f, "| ff:", d2.count("\ufffd"), "| acentos raros:", sum(d2.count(c) for c in ["\u2018", "\u201a", "\u20ac"]))
