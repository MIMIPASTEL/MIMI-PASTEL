from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ancla = """    setGuardando(false);
    setMsg(
      `Turno cerrado · vendido"""
if ancla not in s:
    raise SystemExit("no se encontro el cierre de guardar")

bloque = """    // guardar el cierre de caja del turno
    await supabase.from("cuadres").upsert(
      {
        fecha,
        punto_venta_id: puntoId,
        turno,
        unidades_esperadas: filas.reduce((a, f) => a + disponible(f), 0),
        unidades_contadas: filas.reduce((a, f) => a + (f.contado === "" ? 0 : Number(f.contado)), 0),
        dinero_esperado: ventaNeta,
        dinero_contado: cobrado,
        estado:
          Math.abs(diferenciaDinero) < 0.01
            ? "ok"
            : Math.abs(diferenciaDinero) <= 5
              ? "diferencia_leve"
              : "diferencia_grave",
        cerrado_por: perfil?.id,
        cerrado_en: new Date().toISOString(),
      },
      { onConflict: "fecha,punto_venta_id,turno" },
    );

""" + ancla

s = s.replace(ancla, bloque, 1)
p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| cuadre:", "cuadres" in s)
