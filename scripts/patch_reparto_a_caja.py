from pathlib import Path

p = Path("app/repartos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ancla = """    if (pagos.length) await supabase.from("pagos").insert(pagos);"""

nuevo = """    if (pagos.length) await supabase.from("pagos").insert(pagos);

    // refleja el cobro en el flujo de caja
    const ref = `reparto:${fecha}:${puntoId}`;
    await supabase.from("movimientos_caja").delete().eq("referencia", ref);

    const movimientos: any[] = [];
    const etiqueta = `Reparto ${punto?.codigo ?? ""}`.trim();
    if (Number(efectivo || 0) > 0)
      movimientos.push({
        fecha,
        tipo: "ingreso",
        categoria_codigo: "venta",
        monto: Number(efectivo),
        medio: "efectivo",
        concepto: etiqueta,
        referencia: ref,
      });
    if (Number(yape || 0) > 0)
      movimientos.push({
        fecha,
        tipo: "ingreso",
        categoria_codigo: "venta",
        monto: Number(yape),
        medio: "yape",
        concepto: etiqueta,
        referencia: ref,
      });
    if (movimientos.length) await supabase.from("movimientos_caja").insert(movimientos);"""

if ancla in s and "movimientos_caja" not in s:
    s = s.replace(ancla, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "movimientos_caja" in s)
