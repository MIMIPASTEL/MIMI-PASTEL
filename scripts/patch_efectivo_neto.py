from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. el efectivo digitado es NETO: se le suman los gastos para obtener lo cobrado
viejo = "  const cobrado = Number(efectivo || 0) + Number(yape || 0) + Number(transferencia || 0);"
nuevo = (
    "  const gastosTurno = Number(gasto || 0);\n"
    "  const efectivoBruto = Number(efectivo || 0) + gastosTurno;\n"
    "  const cobrado = efectivoBruto + Number(yape || 0) + Number(transferencia || 0);"
)
if viejo not in s:
    raise SystemExit("no se encontro cobrado")
s = s.replace(viejo, nuevo, 1)

# 2. pagos y cuadre guardan el efectivo bruto
s = s.replace(
    'pagos.map((p) => ({ venta_id: ventaId, punto_venta_id: puntoId, fecha, medio: p.medio, monto: p.monto })),',
    'pagos.map((p) => ({ venta_id: ventaId, punto_venta_id: puntoId, fecha, medio: p.medio, monto: p.monto })),',
    1,
)
s = s.replace(
    "        efectivo: Number(efectivo || 0),",
    "        efectivo: efectivoBruto,",
    1,
)

# 3. indicador: lo que recibe en mano
s = s.replace(
    '            <div className="label">Efectivo a entregar</div>',
    '            <div className="label">Efectivo recibido</div>',
    1,
)
s = s.replace(
    "            <div className=\"value\" style={{ fontSize: 17 }}>{soles(Number(efectivo || 0) - Number(gasto || 0))}</div>",
    "            <div className=\"value\" style={{ fontSize: 17 }}>{soles(Number(efectivo || 0))}</div>",
    1,
)
s = s.replace(
    "            <div className=\"hint\">efectivo − gasto {soles(Number(gasto || 0))}</div>",
    "            <div className=\"hint\">+ gastos {soles(gastosTurno)} = {soles(efectivoBruto)}</div>",
    1,
)

# 4. texto de ayuda
s = s.replace(
    "            <strong>Efectivo a entregar</strong> = efectivo cobrado \u2212 gastos pagados de ese efectivo.",
    "            <strong>Efectivo</strong> = lo que recibes en mano, ya descontados los gastos. El sistema les suma los gastos para saber cu\u00e1nto se cobr\u00f3 realmente.",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", "efectivoBruto" in s, "| gastosTurno:", "gastosTurno" in s)
