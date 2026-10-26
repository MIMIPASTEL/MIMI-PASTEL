import re
from pathlib import Path

FUNC = (
    "  function enviarWhatsapp(p: Pedido) {\n"
    "    const items = (p.pedido_items ?? []) as any[];\n"
    "\n"
    "    const total = items.reduce((a, it) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0), 0);\n"
    "    const adelanto = Number(p.adelanto ?? 0);\n"
    "    const saldo = Math.max(0, total - adelanto);\n"
    "\n"
    "    const [y, m, d] = String(p.fecha_entrega).split(\"-\");\n"
    "    const fecha = `${d}/${m}/${y}`;\n"
    "\n"
    "    let hora = \"\";\n"
    "    if (p.hora_entrega) {\n"
    "      const [hh, mi] = String(p.hora_entrega).split(\":\");\n"
    "      const h24 = Number(hh);\n"
    "      const suf = h24 >= 12 ? \"p.m.\" : \"a.m.\";\n"
    "      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;\n"
    "      hora = `${String(h12).padStart(2, \"0\")}:${mi} ${suf}`;\n"
    "    }\n"
    "\n"
    "    const detalle = items\n"
    "      .map((it) => {\n"
    "        const nombre = it.productos?.nombre ?? nombres[it.producto_id] ?? \"Producto\";\n"
    "        const subtotal = (Number(it.cantidad) * Number(it.precio_unitario ?? 0)).toFixed(2);\n"
    "        const lineas = [`\U0001F382 ${nombre} \u00d7 ${Number(it.cantidad)} \u2014 S/ ${subtotal}`];\n"
    "        if (it.tamano) lineas.push(`   \U0001F370 Tama\u00f1o: ${it.tamano}`);\n"
    "        if (it.empaque) lineas.push(`   \U0001F4E6 Empaque: ${it.empaque}`);\n"
    "        if (it.nota) lineas.push(`   \U0001F58C\uFE0F Decoraci\u00f3n: ${it.nota}`);\n"
    "        return lineas.join(\"\\n\");\n"
    "      })\n"
    "      .join(\"\\n\\n\");\n"
    "\n"
    "    const texto =\n"
    "      `\U0001F9C1 *MIMI PASTEL*\\n` +\n"
    "      `_Confirmaci\u00f3n de pedido_\\n\\n` +\n"
    "      `\u00a1Gracias por tu pedido! \U0001F497\\n` +\n"
    "      `Nos alegra ser parte de tus momentos especiales.\\n\\n` +\n"
    "      `\U0001F464 *Cliente:* ${p.cliente}\\n` +\n"
    "      `\U0001F4C5 *Entrega:* ${fecha}${hora ? \" \u00b7 \" + hora : \"\"}\\n` +\n"
    "      (p.lugar ? `\U0001F4CD *Lugar:* ${p.lugar}\\n` : \"\") +\n"
    "      `\\n\U0001F497 *DETALLE DEL PEDIDO* \U0001F497\\n` +\n"
    "      `------------------------------\\n` +\n"
    "      `${detalle}\\n` +\n"
    "      `------------------------------\\n\\n` +\n"
    "      `\U0001F9FE Total: *S/ ${total.toFixed(2)}*\\n` +\n"
    "      `\U0001F4B5 Adelanto: S/ ${adelanto.toFixed(2)}\\n` +\n"
    "      `\u2757 *SALDO PENDIENTE: S/ ${saldo.toFixed(2)}*\\n\\n` +\n"
    "      `Gracias por confiar en Mimi Pastel \U0001F497\\n` +\n"
    "      `_Si no le gusta, no lo paga._`;\n"
    "\n"
    "    const tel = (p.telefono ?? \"\").replace(/\\D/g, \"\");\n"
    "    const destino = tel.length === 9 ? `51${tel}` : tel;\n"
    "    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, \"_blank\");\n"
    "  }\n"
)

p = Path("app/pedidos/page.tsx")
t = p.read_text(encoding="utf-8").replace("\r\r\n", "\n").replace("\r\n", "\n")

patron = re.compile(r"  function enviarWhatsapp\(p: Pedido\) \{.*?\n  \}\n", re.S)
t, n = patron.subn(lambda m: FUNC, t, count=1)
print("reemplazada:", n)

p.write_bytes(t.encode("utf-8"))

final = p.read_text(encoding="utf-8")
print("emoji pastel:", final.count("\U0001F9C1"), "| corazon:", final.count("\U0001F497"))
print("mojibake:", final.count("\u00c3"))
