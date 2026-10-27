from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ancla = "    // guardar el cierre de caja del turno"

bloque = '''    // 6b. el dinero cobrado en el turno entra al flujo de caja
    const refTurno = `turno:${fecha}:${puntoId}:${turno}`;
    await supabase.from("movimientos_caja").delete().eq("referencia", refTurno);

    const codigoPunto = puntos.find((x) => x.id === puntoId)?.codigo ?? "";
    const ingresosTurno: any[] = [];

    if (Number(efectivoBruto) > 0)
      ingresosTurno.push({
        fecha,
        punto_venta_id: puntoId,
        turno,
        tipo: "ingreso",
        categoria_codigo: "venta",
        medio: "efectivo",
        monto: Number(efectivoBruto),
        concepto: `Venta ${codigoPunto}`.trim(),
        referencia: refTurno,
        creado_por: perfil?.id,
      });

    if (Number(yape || 0) > 0)
      ingresosTurno.push({
        fecha,
        punto_venta_id: puntoId,
        turno,
        tipo: "ingreso",
        categoria_codigo: "venta",
        medio: "yape",
        monto: Number(yape),
        concepto: `Venta ${codigoPunto}`.trim(),
        referencia: refTurno,
        creado_por: perfil?.id,
      });

    if (Number(transferencia || 0) > 0)
      ingresosTurno.push({
        fecha,
        punto_venta_id: puntoId,
        turno,
        tipo: "ingreso",
        categoria_codigo: "venta",
        medio: "transferencia",
        monto: Number(transferencia),
        concepto: `Venta ${codigoPunto}`.trim(),
        referencia: refTurno,
        creado_por: perfil?.id,
      });

    if (ingresosTurno.length) await supabase.from("movimientos_caja").insert(ingresosTurno);

''' + ancla

if ancla in s and "ingresosTurno" not in s:
    s = s.replace(ancla, bloque, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "ingresosTurno" in s)
