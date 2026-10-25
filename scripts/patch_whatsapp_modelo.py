from pathlib import Path
import re

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

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
        const lineas = [`🎂 ${nombre} × ${Number(it.cantidad)} — S/ ${subtotal}`];
        if (it.tamano) lineas.push(`   🍰 Tamaño: ${it.tamano}`);
        if (it.empaque) lineas.push(`   📦 Empaque: ${it.empaque}`);
        if (it.nota) lineas.push(`   🖌️ Decoración: ${it.nota}`);
        return lineas.join("\\n");
      })
      .join("\\n\\n");

    const texto =
      `🧁 *MIMI PASTEL*\\n` +
      `_Confirmación de pedido_\\n\\n` +
      `¡Gracias por tu pedido! 💗\\n` +
      `Nos alegra ser parte de tus momentos especiales.\\n\\n` +
      `👤 *Cliente:* ${p.cliente}\\n` +
      `📅 *Entrega:* ${fecha}${hora ? " · " + hora : ""}\\n` +
      (p.lugar ? `📍 *Lugar:* ${p.lugar}\\n` : "") +
      `\\n💗 *DETALLE DEL PEDIDO* 💗\\n` +
      `━━━━━━━━━━━━━━━\\n` +
      `${detalle}\\n` +
      `━━━━━━━━━━━━━━━\\n\\n` +
      `🧾 Total: *S/ ${total.toFixed(2)}*\\n` +
      `💵 Adelanto: S/ ${adelanto.toFixed(2)}\\n` +
      `❗ *SALDO PENDIENTE: S/ ${saldo.toFixed(2)}*\\n\\n` +
      `Gracias por confiar en Mimi Pastel 💗\\n` +
      `_Si no le gusta, no lo paga._`;

    const tel = (p.telefono ?? "").replace(/\\D/g, "");
    const destino = tel.length === 9 ? `51${tel}` : tel;
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, "_blank");
  }
'''

patron = re.compile(r"  function enviarWhatsapp\(p: Pedido\) \{.*?\n  \}\n", re.S)
s2, n = patron.subn(lambda m: nuevo, s, count=1)
if n != 1:
    raise SystemExit("no se pudo reemplazar la funcion")

p.write_text(s2, encoding="utf-8")
print("ok:", s2 != orig)
